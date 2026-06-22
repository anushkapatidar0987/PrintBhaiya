# PrintKarDoBhaiya — Cybersecurity & Payment Safety

> Part of the 6-file doc set. Read `00_MASTER_PRD.md`, `01_SYSTEM_DESIGN_ARCHITECTURE.md`, and `02_DATABASE_DESIGN.md` first. This file defines the **security posture**: what threats this system faces, and the specific controls required to reduce them, with particular focus on payment safety since real money moves through this system. Pair with `04_SECURITY_AUDIT_HARDENING_PLAN.md` for the ongoing audit/hardening process.

---

## 1. Threat Model Overview

| Asset | Why it matters | Primary threats |
|---|---|---|
| User accounts (student, shop, admin) | Identity, access to orders/payments | Credential stuffing, weak passwords, session hijacking |
| Uploaded files | May contain personal/academic data | Unauthorized access, malware-laden uploads, storage abuse |
| Payment flow | Real money | Payment spoofing, webhook forgery, replay attacks, price tampering |
| Order/pricing data | Business integrity | Price manipulation, status forgery (fake "accepted"/"ready"), enumeration |
| Super Admin portal | Full platform control | Privilege escalation, unauthorized access |
| Notification channels (Email/WhatsApp) | Trust, deliverability | Spam abuse, phishing impersonation using platform's identity |

---

## 2. Authentication & Session Security

- **Password storage**: Django's default password hashing (PBKDF2 or Argon2 if configured) — never store plaintext or use weak/reversible hashing. Do not roll a custom hashing scheme.
- **JWT tokens**: short-lived access tokens (e.g., 15-30 min), longer-lived refresh tokens (e.g., 7 days) with rotation on refresh. Refresh tokens should be revocable (blacklist on logout/password change) — `djangorestframework-simplejwt`'s blacklist app supports this.
- **Rate limit login attempts** per IP and per account (e.g., via `django-axes` or DRF throttling) to prevent brute-force/credential-stuffing attacks.
- **Enforce strong passwords** at signup (Django's built-in password validators — minimum length, not too common, not entirely numeric).
- **Email verification required** before full account privileges (e.g., before placing/accepting orders) — reduces fake/throwaway accounts and improves notification trust.
- **HTTPS everywhere, no exceptions** — Render and Vercel provide free TLS; enforce `SECURE_SSL_REDIRECT=True` and HSTS headers in Django settings for production.
- **Use UUIDs for all public-facing object IDs** (already specified in DB doc) rather than sequential integers, to prevent enumeration attacks (e.g., guessing `/api/orders/1234/` to probe other users' orders).

---

## 3. Authorization (Access Control)

- **Every API endpoint must explicitly check role + ownership**, not just authentication. Examples of checks that must exist:
  - A student can only `GET` their own orders, never another student's, even by guessing an order UUID — enforce via queryset filtering (`Order.objects.filter(student=request.user)`), not just object-level permission checks after fetch.
  - A shop owner can only see/modify orders where `order.shop.owner == request.user`.
  - Only Super Admin role can access `/api/admin/*` endpoints — verify via a dedicated permission class, tested explicitly (this is a common real-world vulnerability class: missing or incorrect admin-route gating).
- **Insecure Direct Object Reference (IDOR) is the single most important class of bug to prevent in this system**, since orders contain personal files and payment data. Every detail/update endpoint must re-verify ownership server-side on every request, never trust a previously-rendered UI state.
- File access: uploaded file URLs from Cloudinary/S3 should not be permanently public/guessable. Use **signed, time-limited URLs** for file access (both Cloudinary and S3 support this) so a leaked/guessed URL doesn't grant indefinite access to a student's uploaded document. Only the order's student, the assigned shop, and Super Admin should be able to request a signed URL for a given file, gated by the same ownership check as above.

---

## 4. File Upload Security

This is a notable attack surface since the core product feature is "upload arbitrary files."

- **Whitelist file types** strictly: PDF, DOCX, DOC, JPG, PNG (and similar — define exact list, do not accept arbitrary extensions or executable types like `.exe`, `.sh`, `.js`, `.html`, `.svg` which can carry embedded scripts).
- **Validate by content, not just extension** — check actual file signature/MIME type server-side (a renamed `.exe` to `.pdf` should be rejected). Libraries like `python-magic` can verify true file type.
- **Enforce file size limits** (e.g., reasonable max per file, e.g., 25-50MB — tune based on real usage, but cap it) to prevent storage abuse and denial-of-service via huge uploads.
- **Limit number of files per order** to a sane cap to prevent abuse.
- **Malware scanning consideration**: at minimum, document this as a known v1 risk (Master PRD Section 8 already flags it). If budget allows even a free/low-cost antivirus scanning API (e.g., ClamAV self-hosted, or a scanning step before forwarding to Cloudinary/S3) integrate it; if not feasible at launch, ensure files are stored with **no direct execution risk** (i.e., never served in a way that could execute as a script in a browser context — set correct `Content-Disposition` and `Content-Type` headers when serving, so a malicious file is downloaded, not executed).
- **Rate-limit uploads** per user/IP (e.g., via DRF throttling) to prevent storage-exhaustion abuse against the free-tier storage quota.
- Files uploaded through the Django backend (not direct-to-client-storage, per architecture doc decision) means **all validation above happens server-side before forwarding to Cloudinary/S3** — this is the security reason that architectural choice was made, not just simplicity.

---

## 5. Payment Security (Razorpay) — Critical Section

**Core principle: the frontend's claim that "payment succeeded" must never be trusted. Only a verified, signed server-to-server webhook from Razorpay (or a verified server-side API call to Razorpay to confirm payment status) can mark an order as paid.**

### 5.1 Flow integrity
1. Order total is calculated **server-side** by the Pricing Engine (per architecture doc) — never accept a client-supplied price. The Razorpay order amount must be set from the server-computed `Order.total_amount`, not from any value passed by the frontend.
2. A Razorpay Order is created server-side (`razorpay_order_id`), tying a specific amount to a specific internal `Order` record before Checkout is even opened.
3. After Razorpay Checkout completes, the frontend receives a payment confirmation callback — **this is for UX only** (e.g., "redirecting you...", show a spinner) and **must never be the trigger that marks the order as paid**.
4. The **webhook endpoint** (`POST /api/payments/webhook/razorpay/`) is the only authoritative source of payment confirmation. On receiving a webhook event:
   - **Verify the Razorpay webhook signature** using the webhook secret (HMAC verification per Razorpay's documented method) — reject any request that fails signature verification, log the attempt as a potential security event.
   - Confirm the `razorpay_order_id` in the payload matches a known, expected, still-`CREATED`-status `Payment` record in the DB — reject/flag mismatches.
   - Confirm the **amount in the webhook payload matches** `Order.total_amount` exactly — reject and flag any mismatch (defense against tampering or integration bugs).
   - Only after all checks pass: update `Payment.status = PAID`, `Order.status = PLACED`, trigger notifications.
5. **Idempotency**: webhook delivery can be retried by Razorpay (duplicate delivery is expected, not an error). The handler must be idempotent — processing the same `razorpay_payment_id` twice must not create duplicate orders, double-trigger notifications, or cause inconsistent state. Check current status before transitioning (e.g., if already `PAID`, acknowledge with 200 OK and do nothing further).
6. Always return appropriate HTTP status codes to Razorpay's webhook caller promptly (2xx on success) — slow/failed responses can cause retry storms.

### 5.2 Secrets management
- Razorpay **API key/secret** and **webhook secret** are separate credentials — both must be stored as environment variables (per architecture doc Section 10), never hardcoded, never logged, never exposed to frontend (frontend only ever receives the public **Key ID**, never the **Key Secret**).
- Rotate keys if any suspected exposure (e.g., accidental commit) immediately via Razorpay dashboard.

### 5.3 PCI-DSS scope reduction
- The platform should **never directly handle, see, or store raw card numbers, CVVs, or UPI PINs**. Razorpay Checkout (hosted/embedded by Razorpay's own SDK) handles all sensitive payment input — this keeps the platform largely out of PCI-DSS scope. **Do not build a custom payment form that collects card details directly** — always use Razorpay's provided Checkout component/SDK.

### 5.4 Refunds
- v1 refund process is **manual, Super Admin-initiated** (per Master PRD Section 9 scope decision) — but the **technical capability** (calling Razorpay's refund API, updating `Payment.status` to `REFUND_INITIATED`/`REFUNDED`) should still be built securely: only accessible via Super Admin-gated endpoint, fully logged in `OrderStatusHistory`/an audit log, and reconciled against Razorpay's actual refund confirmation (again via webhook, not just "we called the API so assume it worked").

### 5.5 Logging discipline around payments
- **Never log full payment payloads, card-adjacent data, or webhook secrets to plaintext application logs** (these often end up in less-secured log aggregation tools). Store the necessary audit payload in the DB (`Payment.raw_webhook_payload`, access-controlled) rather than stdout/log files where retention/access policies are looser.
- Mask/redact sensitive fields in any error tracking tool (e.g., Sentry, if added) — configure scrubbing for known sensitive field names.

---

## 6. API & Network-Level Protections

- **CORS**: lock down allowed origins to the actual deployed frontend domain(s) only (Vercel production URL + any staging URL) — do not leave CORS wide open (`*`) in production.
- **CSRF**: for cookie-based session auth paths (if Django Admin is used by Super Admin), standard Django CSRF protection applies. For the JWT-based API consumed by the React frontend, CSRF is less relevant (token-based, not cookie-based) but ensure tokens aren't also stored in a way that re-introduces CSRF risk (e.g., avoid storing JWT in a cookie without `SameSite`/CSRF mitigation if that pattern is used).
- **Rate limiting / throttling** on all public and sensitive endpoints (login, signup, order creation, file upload, webhook) via DRF throttling classes — protects both against abuse and against accidentally exhausting free-tier infra quotas (ties to Master PRD traffic management section).
- **Input validation** on every serializer — DRF serializers should validate types, lengths, choices strictly; never trust client input for anything that affects price, status, or ownership.
- **SQL injection**: Django ORM parameterizes queries by default — **never use raw SQL string formatting with user input**; if raw queries are ever necessary, use parameterized queries only.
- **XSS**: React escapes output by default — avoid `dangerouslySetInnerHTML` with any user-supplied content (e.g., student comments, shop names) without sanitization. Django templates (if used anywhere, e.g., email templates) auto-escape by default — don't disable this for user-supplied content.
- **Security headers**: set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or `SAMEORIGIN` if any legitimate embedding is needed), `Content-Security-Policy` appropriate to the frontend's actual resource origins, `Strict-Transport-Security`. Django's `django-secure`/built-in security middleware settings cover several of these — enable them explicitly in production settings.

---

## 7. WhatsApp & Email Notification Security

- **Never include sensitive data unnecessarily** in notification content (e.g., don't put full payment details in a WhatsApp message; an order number + status + a link to log in and view details is sufficient and safer).
- **Verify recipient phone/email belongs to the actual account holder** at signup (email verification at minimum; phone verification via OTP is a stronger but optional v1 enhancement — flag as a nice-to-have not a blocker).
- Notification links (e.g., "view your order") should require login, not be open/guessable direct-access links to order data — ties back to Section 3's IDOR concern.
- Monitor for notification system abuse (e.g., someone spamming the order-creation endpoint just to trigger mass WhatsApp/email sends to arbitrary numbers/addresses) — this is mitigated by requiring authenticated, role-checked order creation tied to a real paid order, not an open endpoint.

---

## 8. Super Admin Portal Specific Protections

- Treat this as the **highest-value target** in the system — it can see all transactions, all shops, all orders.
- Enforce **strong authentication** for Super Admin accounts specifically — consider requiring a notably strong password policy and, if feasible, **two-factor authentication (2FA)** for this role even if not implemented for regular students/shops in v1 (flag as a high-priority hardening item if not in initial MVP — see hardening doc).
- Do not expose Super Admin functionality through the same general-purpose API routes as regular users with just a role check buried in logic — keep Super Admin endpoints clearly namespaced (`/api/admin/...`) and reviewed with extra scrutiny in code review, since a missed permission check here is the highest-impact possible bug in the system.
- Limit who has Super Admin credentials in practice (founder-only at launch) — this is an operational control, not just a technical one.

---

## 9. Dependency & Infrastructure Hygiene

- Keep Django, DRF, and all Python/JS dependencies updated — subscribe to security advisories (e.g., GitHub Dependabot alerts) for the repository.
- Pin dependency versions (`requirements.txt` / `package-lock.json`) for reproducible builds, but review and update regularly rather than letting them go stale indefinitely (stale deps are a common real-world breach vector).
- `DEBUG=False` in production **always** — Django's debug mode can leak sensitive stack traces/settings if accidentally left on in production.
- `ALLOWED_HOSTS` locked to actual production domain(s) only.
- Environment variables/secrets never committed to git — use `.gitignore` for `.env`, and double check no secrets exist in commit history before making any repository public.

---

## 10. Incident Response (Baseline, v1)

Even a small launch-stage product should have a minimal plan:
- A designated contact point (founder) for security reports — consider a simple `security@` email or a note in the site footer for responsible disclosure.
- If a breach/incident occurs (e.g., suspected unauthorized access, payment discrepancy): rotate all relevant secrets immediately (Razorpay keys, DB credentials, JWT signing key), review `OrderStatusHistory`/`NotificationLog`/Payment audit data to assess scope, and notify affected users transparently per applicable data protection norms.
- Keep this section's process informal but **documented and actually known to the founder** — the worst time to design an incident response process is during an actual incident.

---

## 11. Cross-References

- Ongoing audit checklist, penetration testing plan, and hardening roadmap (including items flagged above as "future hardening"): `04_SECURITY_AUDIT_HARDENING_PLAN.md`
- Underlying data model referenced throughout (Order, Payment, NotificationLog, etc.): `02_DATABASE_DESIGN.md`
- Architectural context for webhook endpoint, file upload flow, auth flow: `01_SYSTEM_DESIGN_ARCHITECTURE.md`
