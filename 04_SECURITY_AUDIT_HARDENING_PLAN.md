# PrintKarDoBhaiya — Security Audit & Hardening Plan

> Part of the 6-file doc set. Read `03_CYBERSECURITY_PAYMENT_SAFETY.md` first — that file defines *what controls must exist*; this file defines **how to verify they exist, on what cadence, and the roadmap for hardening beyond v1 launch baseline**. Treat this as a living checklist, not a one-time document — update it as audits are performed and items resolved.

---

## 1. Purpose & Cadence

| Activity | Frequency | Owner |
|---|---|---|
| Pre-launch security checklist (Section 2) | Once, before public launch | Founder/dev team |
| Dependency vulnerability scan | Continuous (automated, e.g., Dependabot/GitHub security alerts) + manual review monthly | Dev team |
| Manual code review of payment/auth/admin code paths | Before every release touching those areas | Dev team |
| Self-conducted security audit (Section 4) | Quarterly, or before any major feature launch (e.g., before introducing platform fees in Phase 2) | Founder/dev team |
| External/professional penetration test | Once meaningful transaction volume exists (suggested trigger: before or shortly after Phase 2 monetization launch, per Master PRD) — budget permitting | External vendor (future) |
| Incident response drill (tabletop, informal) | Annually once team exists beyond solo founder | Founder/dev team |

---

## 2. Pre-Launch Security Checklist (must pass before going live to real students/shops with real payments)

> AI agents/devs: treat every unchecked item below as a launch blocker, not a nice-to-have, unless explicitly marked optional.

### Authentication & Access
- [ ] Passwords hashed via Django's default (PBKDF2/Argon2) — confirmed no custom/weak hashing introduced
- [ ] JWT access token expiry ≤ 30 min, refresh token rotation enabled, blacklist-on-logout implemented
- [ ] Login endpoint rate-limited (per IP and per account)
- [ ] Signup requires email verification before order placement/acceptance privileges
- [ ] Role-based permission classes applied to **every** endpoint (manually audit the full URL list against this — missing one is the most common real-world bug)
- [ ] IDOR check: for each "detail" or "update" endpoint (order detail, shop detail, file access), confirmed server-side ownership check exists and was tested by attempting cross-account access manually

### Payments
- [ ] Order amount always computed server-side, never trusts client-supplied price
- [ ] Razorpay webhook signature verification implemented and tested (including a deliberately-invalid-signature test case)
- [ ] Webhook handler confirmed idempotent (tested by simulating duplicate webhook delivery)
- [ ] Webhook amount cross-checked against internal `Order.total_amount` before marking paid
- [ ] Razorpay Key Secret and webhook secret confirmed never present in frontend bundle (search built frontend JS for the secret string as a sanity check)
- [ ] Refund capability tested in Razorpay test/sandbox mode end-to-end

### File Uploads
- [ ] File type whitelist enforced server-side via content inspection, not just extension
- [ ] File size limit enforced server-side (not just frontend validation, which can be bypassed)
- [ ] Uploaded files served with safe `Content-Disposition`/`Content-Type` headers (no inline script execution risk)
- [ ] File access URLs are signed/time-limited, not permanently public
- [ ] Upload endpoint rate-limited

### Infrastructure
- [ ] `DEBUG=False` confirmed in production settings
- [ ] `ALLOWED_HOSTS` locked to actual domain(s)
- [ ] HTTPS enforced (`SECURE_SSL_REDIRECT`, HSTS header present)
- [ ] CORS locked to actual frontend origin(s) only
- [ ] All secrets confirmed in environment variables, none in source control (run a search through git history for common secret patterns before any repo visibility change)
- [ ] Security headers present (`X-Content-Type-Options`, `X-Frame-Options`, CSP) — verify via a header-check tool against the deployed staging URL

### Super Admin
- [ ] Super Admin endpoints namespaced and confirmed inaccessible to non-admin roles (test with a student/shop JWT against `/api/admin/*`)
- [ ] Super Admin account uses a strong, unique password; 2FA enabled if implemented (see Section 5 roadmap if not yet built)
- [ ] Number of Super Admin accounts in production confirmed minimal (founder-only at launch)

### Notifications
- [ ] Notification content reviewed to confirm no sensitive payment data (full card/UPI info — should never be present anyway per architecture) is included
- [ ] Notification links require authentication, not direct unguarded access to order data
- [ ] WhatsApp message templates submitted and approved by provider (Meta/Gupshup) ahead of launch date — template approval is not instant, plan lead time

### Legal/Trust Pages (not strictly "security" but bundled into pre-launch trust checklist)
- [ ] Privacy Policy published and accurate to actual data practices
- [ ] Terms of Service published, clarifying platform's facilitator role
- [ ] Refund Policy published and visible before checkout

---

## 3. Testing Methods for the Checklist Above (how to actually verify, not just assume)

| Control | How to test it |
|---|---|
| IDOR protection | Create two test accounts (Student A, Student B). Place an order as Student A, note its UUID. Attempt to fetch/modify it using Student B's auth token. Expect 403/404, not success. Repeat for shop-to-shop and shop-to-other-student's-order access. |
| Webhook signature verification | Send a manually crafted POST to the webhook endpoint with an invalid/missing signature header. Expect rejection (4xx), and confirm no order/payment status changed as a result. |
| Webhook idempotency | Using Razorpay's test mode (or manually replaying a captured valid webhook payload), send the same webhook payload twice. Confirm the second delivery does not duplicate notifications or corrupt state. |
| Price tampering | Attempt to call the order-creation endpoint with a manipulated/forged price field (if such a field is even exposed — ideally it isn't accepted from client at all). Confirm server ignores/rejects client-supplied price and always computes its own. |
| File type bypass | Attempt to upload a file with a `.pdf` extension but actual executable/script content (e.g., rename a `.html` file with embedded script to `.pdf`). Confirm content-based validation rejects it, not just extension check. |
| Rate limiting | Script repeated rapid requests to the login endpoint with wrong credentials. Confirm throttling kicks in (429 response) rather than unlimited attempts. |
| Admin route protection | Using a non-admin JWT, attempt every `/api/admin/*` endpoint. Confirm all return 403. |
| CORS lockdown | From a browser console on an unrelated origin, attempt a fetch to the production API. Confirm it's blocked by CORS policy. |
| Secrets leakage | Search the built/minified frontend JS bundle (what actually ships to browsers) for the Razorpay Key Secret, webhook secret, or any backend credential string. Confirm none present (only the public Key ID should appear). |

---

## 4. Self-Conducted Security Audit Process (Quarterly / Pre-Major-Release)

A lightweight, repeatable process suitable for a small team without dedicated security staff:

1. **Re-run the entire Pre-Launch Checklist (Section 2)** against current production — confirm nothing regressed (e.g., a new endpoint added since launch that's missing a permission check).
2. **Dependency audit**: run `pip list --outdated` / `npm outdated`, review any flagged CVEs in current dependency versions via GitHub security advisories, update and re-test.
3. **Access review**: list every account with elevated privileges (Super Admin, any staff/internal tooling access) — confirm it's still an accurate, minimal list; revoke anything stale.
4. **Log review**: spot-check `NotificationLog` and `OrderStatusHistory` for anomalies — e.g., unusual volume of failed payment attempts from one account, repeated rejected orders pattern, repeated failed login clusters (potential brute-force attempts).
5. **New feature review**: for anything shipped since the last audit, explicitly ask: does this introduce a new endpoint? Does it touch payments, files, or admin functionality? If yes, apply the relevant checklist items from Section 2 to it specifically before considering it audited.
6. **Document findings** (even informally, e.g., in a simple running notes file or issue tracker) — what was found, what was fixed, what's deferred and why. This builds an audit trail that matters both for the founder's own visibility and for any future formal compliance/investor due diligence.

---

## 5. Hardening Roadmap (Beyond v1 Launch Baseline)

These are **not launch blockers** but should be tracked as a prioritized backlog, to be pulled in as the product scales (especially before/around Phase 2 monetization per Master PRD, when transaction volume and trust stakes rise):

| Item | Why it matters | Suggested trigger to implement |
|---|---|---|
| Two-Factor Authentication (2FA) for Super Admin | Reduces single-password-compromise risk on highest-value account | Before Phase 2 monetization, or immediately if budget/time allows even at launch |
| Phone number verification (OTP) at signup | Reduces fake accounts, improves WhatsApp deliverability trust, reduces notification-spam-abuse vector | When fake-account abuse is observed, or proactively at moderate scale |
| Malware/antivirus scanning on uploaded files | Closes a known v1 gap (flagged in `03_CYBERSECURITY_PAYMENT_SAFETY.md`) | As soon as a free/low-cost scanning option is integrated without significant complexity — revisit feasibility each quarter |
| Move from polling to WebSockets/Server-Sent Events for live dashboard updates | UX improvement, not strictly security, but reduces unnecessary API load at scale | When polling load becomes measurable on infra (ties to architecture doc scaling section) |
| Formal external penetration test | Independent validation beyond self-audit; important for trust once real money volume is meaningful | Before or shortly after Phase 2 monetization launch |
| Web Application Firewall (WAF) / managed bot protection | Defense against automated scraping/abuse at scale | When traffic/abuse patterns justify it (free tiers of Cloudflare etc. can be introduced early and cheaply if desired even pre-scale) |
| Formal incident response runbook (beyond the baseline in `03_CYBERSECURITY_PAYMENT_SAFETY.md` Section 10) | More rigorous process as team grows beyond solo founder | Once team has more than 1-2 people with production access |
| Automated security regression tests (integrate Section 3's manual tests into CI) | Prevents regressions silently creeping back in as code changes | As soon as a CI pipeline exists — recommend introducing this fairly early since it's low-cost relative to value |
| Content Security Policy (CSP) tightening / reporting | Reduces XSS blast radius further, gives visibility into violations | After initial launch, once the real set of legitimate script/style origins is stable and known |
| Data Processing/Privacy compliance review (e.g., India's DPDP Act considerations) | Legal risk reduction as user base and data volume grow | Before scaling beyond a single city/campus, and definitely before any B2B/institutional data partnerships (Master PRD Phase 2 monetization idea) — recommend consulting a professional, this doc is not legal advice |

---

## 6. Severity Classification (for triaging any future finding)

When a security issue is found (self-audit, bug report, or incident), classify it to prioritize response:

| Severity | Definition | Example | Response time target |
|---|---|---|---|
| Critical | Direct path to unauthorized payment manipulation, full account takeover, or mass data exposure | Webhook signature bypass allowing fake "paid" orders; IDOR exposing all users' files | Immediate — same day fix/mitigation |
| High | Significant but bounded unauthorized access | A specific endpoint missing ownership check, exposing one user's data to another | Within days |
| Medium | Requires unusual conditions or limited impact | Rate limiting missing on a low-risk endpoint | Within a sprint/release cycle |
| Low | Best-practice gap, minimal real-world exploitability | Missing a non-critical security header | Track in hardening backlog, fix opportunistically |

---

## 7. Cross-References

- All control definitions referenced in checklists above: `03_CYBERSECURITY_PAYMENT_SAFETY.md`
- Data model fields used in log review (Section 4.4): `02_DATABASE_DESIGN.md`
- Where hardening roadmap items should be tracked alongside other build work: `05_PROJECT_PLAN_TASKS.md`
