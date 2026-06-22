# PrintKarDoBhaiya — System Design & Architecture

> Part of the 6-file doc set. Read `00_MASTER_PRD.md` first for product context. This file defines **how the system is built**: components, data flow, APIs, integrations, and scaling plan. Database schema detail lives in `02_DATABASE_DESIGN.md` (this file references it but doesn't duplicate it).

---

## 1. Tech Stack (Confirmed)

| Layer | Technology | Reasoning |
|---|---|---|
| Backend Framework | Django + Django REST Framework (DRF) | Batteries-included (auth, admin, ORM), Django Admin can bootstrap parts of the Super Admin portal quickly, mature ecosystem |
| Language | Python 3.12+ | |
| Database | PostgreSQL | Relational integrity needed for orders/payments/users; free-tier hosted on **Supabase** or **Neon** |
| Frontend | React (Vite) | Fast dev experience, large ecosystem, deployed on **Vercel** |
| File Storage | Cloudinary (preferred) or AWS S3 free tier | Stores uploaded print files; Cloudinary has good free tier + built-in PDF/image handling |
| Payments | Razorpay (Checkout + Webhooks) | As specified; India-first, UPI support |
| Email | SMTP via Brevo free tier | Transactional emails |
| WhatsApp | Meta WhatsApp Cloud API (primary) or Gupshup (fallback wrapper) | Order/status notifications |
| Backend Hosting | Render (free/low tier) | Hosts Django app |
| Frontend Hosting | Vercel (free tier) | Hosts React build |
| Background Jobs | Django Signals initially; Celery + Redis introduced only when justified (see Section 8) | Keep infra minimal at launch |

---

## 2. High-Level Architecture Diagram (textual)

```
                         ┌─────────────────────────┐
                         │      React Frontend      │
                         │   (Vite, on Vercel)       │
                         │                           │
                         │  - Student Portal         │
                         │  - Shop Portal            │
                         │  - Super Admin Portal     │
                         │  - Public shop listing/SEO│
                         └────────────┬──────────────┘
                                      │ HTTPS / REST (JSON)
                                      │ JWT Auth header
                                      ▼
                         ┌─────────────────────────┐
                         │   Django + DRF Backend    │
                         │       (on Render)         │
                         │                           │
                         │  - Auth (JWT)             │
                         │  - Orders API             │
                         │  - Shops API              │
                         │  - Pricing Engine         │
                         │  - Payments (Razorpay)    │
                         │  - Notification Service   │
                         │  - Admin (Django Admin +  │
                         │    custom Super Admin API)│
                         └──┬───────┬───────┬────────┘
                            │       │       │
              ┌─────────────┘       │       └─────────────┐
              ▼                     ▼                      ▼
   ┌────────────────────┐ ┌──────────────────┐  ┌────────────────────┐
   │   PostgreSQL DB     │ │  File Storage     │  │  External Services  │
   │ (Supabase / Neon)   │ │ (Cloudinary / S3) │  │                      │
   │                      │ │                   │  │ - Razorpay API       │
   │ Users, Shops, Orders,│ │ Uploaded print     │  │ - Brevo SMTP         │
   │ Payments, Status logs│ │ files (PDF/DOCX/   │  │ - WhatsApp Cloud API │
   │                      │ │ images)            │  │   / Gupshup          │
   └────────────────────┘ └──────────────────┘  └────────────────────┘
```

### Data flow for a typical order (step-by-step)
1. Browser (React) calls `POST /api/orders/` with file (multipart) + spec + shop_id + comment. Auth via JWT in header.
2. Django validates: shop exists and is `OPEN`, file type/size within limits, spec fields valid.
3. File is uploaded to Cloudinary/S3 (server-side upload, not client-direct, in v1 — simpler, see note below); returns a secure file URL/ID.
4. Backend computes price using the **Pricing Engine** (reads that shop's `PriceList` from DB — see DB doc).
5. Order row created with status `PENDING_PAYMENT`, price snapshot stored (price at time of order, not recalculated later — important for consistency if shop changes prices later).
6. Backend creates a **Razorpay Order** (`razorpay_order_id`) via Razorpay API, returns Razorpay order details + key to frontend.
7. Frontend opens Razorpay Checkout using returned details.
8. On payment completion, Razorpay calls the **webhook endpoint** `POST /api/payments/webhook/razorpay/` (server-to-server, signed) — **this is the source of truth for payment success, not the frontend callback.**
9. Webhook handler verifies signature, marks Order status → `PLACED`, payment status → `PAID`, and triggers the **Notification Service**.
10. Notification Service (via Django signal on Order status change) sends: Email + WhatsApp to shop owner ("New order #PKB-xxxx"), and updates shop dashboard (next poll/fetch will show it; see Section 7 on real-time options).
11. Shop owner accepts/rejects/updates status via `PATCH /api/orders/<id>/status/` from Shop Portal.
12. Each status change triggers relevant notifications per the matrix in Section 6.

> **Note on direct vs server-proxied upload**: For v1 simplicity and security control (validating files before they hit storage, and keeping Cloudinary/S3 credentials off the client), files are uploaded **through the Django backend**, which then forwards to Cloudinary/S3. This is simpler to secure even though it's marginally less efficient than direct-to-storage signed uploads. Revisit only if file upload volume/size becomes a backend bottleneck (see Section 8).

---

## 3. Core Modules / Django Apps (suggested project structure)

```
printkardobhaiya/
├── manage.py
├── config/                  # Django project settings, urls, wsgi/asgi
├── accounts/                 # Custom User model, auth, JWT, roles (student/shop/admin)
├── shops/                    # Shop profile, price list, open/closed status, holidays
├── orders/                   # Order model, status lifecycle, comments
├── pricing/                  # Pricing engine logic (separate from shops app for clarity/testability)
├── payments/                 # Razorpay integration, webhook handling, transaction records
├── notifications/             # Email + WhatsApp senders, notification logs, templates
├── files/                    # Upload handling, storage abstraction (Cloudinary/S3 swappable)
├── core/                     # Shared utilities, permissions, base models (timestamps, soft-delete)
└── superadmin/                # Admin-only APIs/views beyond Django Admin defaults
```

**Rationale**: Each app has a single responsibility. `pricing` is separated from `shops` so the pricing engine can be unit-tested independently and swapped/extended (e.g., adding platform fee in Phase 2) without touching shop CRUD logic. `notifications` is provider-agnostic at the interface level (see Section 6) so WhatsApp provider can be swapped per the risk noted in the Master PRD.

---

## 4. Authentication & Authorization

- **JWT-based auth** (e.g., `djangorestframework-simplejwt`) — access + refresh token pattern.
- Three user roles via a `role` field on the custom User model (or a `UserType` choice): `STUDENT`, `SHOP_OWNER`, `SUPER_ADMIN`. (Detailed in `02_DATABASE_DESIGN.md`.)
- Role-based permission classes in DRF (`IsStudent`, `IsShopOwner`, `IsSuperAdmin`) gate each endpoint.
- A **Shop** is a separate model from the **Shop Owner User** — one user owns one shop in v1 (1:1), but model it as 1:Many capable (owner → shops) even if v1 enforces one, to avoid a painful migration if multi-branch is needed later (per Master PRD Section 9, this is explicitly deferred, but the FK direction should still allow it cheaply).
- **Shop accounts require Super Admin approval** (an `is_approved` boolean, defaults `False`) before the shop becomes visible/orderable — prevents spam/fake shop signups.
- Email verification recommended for both student and shop signups (reduces fake accounts, improves notification deliverability trust).
- Password reset via standard Django flows (email-based).

---

## 5. Pricing Engine (Logic Spec)

This is core business logic — must be precise.

**Inputs**: shop's `PriceList` (per-page B&W rate, per-page color rate, per-side or per-sheet logic, binding charges by type, minimum order charge if any), the order's spec (page count — derived from uploaded file or manually entered by student if auto-detection fails, color mode, copies, single/double-sided, binding type).

**Output**: total price (in paise/INR, stored as integer paise to avoid float rounding issues — standard practice for money fields).

**Calculation outline** (exact formula is shop-configurable, but a sane default):
```
price_per_unit = price_list.color_rate if spec.color_mode == 'COLOR' else price_list.bw_rate
base_pages_cost = page_count * price_per_unit * copies
   (if double-sided, sheets_used = ceil(page_count / 2) — but cost is usually still per printed side;
    this should be a configurable rule on PriceList, not hardcoded, since shops price differently)
binding_cost = price_list.binding_charges.get(spec.binding_type, 0)
platform_fee = 0   # Phase 1; field exists, defaults to 0 (see Master PRD Section 4)
total = base_pages_cost + binding_cost + platform_fee
```

**Important implementation notes**:
- **Snapshot the price** on the Order at creation time (`Order.price_breakdown` JSON field + `Order.total_amount`). Never recompute historical orders if the shop later changes its price list — this is both a UX/trust issue and an accounting integrity issue.
- Page count detection: for PDFs, can be auto-counted server-side (e.g., via a library when the file is processed); for DOCX/images, may require the student to manually input page/copy count, or the shop to confirm/adjust before accepting (flag this explicitly to whoever builds it — **page-count auto-detection reliability across file types should be tested, not assumed**).
- If a shop doesn't support a requested spec (e.g., no color printing), that option should not even be selectable in the UI for that shop — validate this server-side too, not just client-side.

---

## 6. Notification System

### Design principle
**Shopkeepers and students should never need to manually refresh/check for updates.** Every state-changing event triggers a push across multiple channels, with the website itself also reflecting the live status whenever the user does visit.

### Notification triggers matrix

| Event | Notify Who | Channels |
|---|---|---|
| Payment successful → Order placed | Shop owner | Email + WhatsApp + (dashboard badge/in-app) |
| Order accepted by shop | Student | Email + WhatsApp + in-app |
| Order rejected by shop | Student | Email + WhatsApp + in-app (include reason if provided) |
| Order status → Printing | Student | In-app (Email/WhatsApp optional here — avoid notification fatigue; recommend in-app only for this intermediate step) |
| Order status → Ready for Collection | Student | Email + WhatsApp + in-app (this is the most important one — make it prominent) |
| Order marked Collected | Student (confirmation), Shop (record) | In-app only |
| Shop hasn't updated open/closed status by cutoff interval | Shop owner | Email (reminder) |
| New shop signup pending approval | Super Admin | Email |
| Shop approved | Shop owner | Email |
| Payment failed | Student | In-app + Email (so they have a record/can retry) |

### Architecture for notifications
- Triggered via **Django signals** (`post_save` on Order status change, etc.) calling a `NotificationService` interface — not embedded directly in views, so notification logic is testable and reusable.
- `NotificationService` has provider-agnostic methods: `send_email(to, template, context)`, `send_whatsapp(to, template, context)`. Concrete provider classes (`BrevoEmailProvider`, `MetaWhatsAppProvider`, `GupshupWhatsAppProvider`) implement a common interface — **this satisfies the Master PRD risk note about WhatsApp provider swappability**.
- All notification attempts are logged in a `NotificationLog` table (status: sent/failed, provider response) for debugging delivery issues — critical since "shopkeeper missed an order" is a high-severity failure mode.
- WhatsApp messages should use **WhatsApp-approved message templates** (required by Meta/Gupshup for business-initiated messages outside a 24-hour customer service window) — template approval takes a few days, plan for this in the project timeline (`05_PROJECT_PLAN_TASKS.md`).
- Email via Brevo SMTP — straightforward Django `EMAIL_BACKEND` config pointing to Brevo SMTP credentials.

---

## 7. Real-Time Updates (Dashboard Live Status)

For v1, **polling is sufficient and simpler than WebSockets** given free-tier hosting constraints:
- Shop dashboard polls `GET /api/orders/?shop=me&status=active` every N seconds (e.g., 15-30s) while the tab is open, OR simply relies on a manual refresh + the Email/WhatsApp notification as the primary "don't need to check" mechanism (per product requirement, notification channels are the real solution; polling is just a UX nicety for when they're already on the page).
- Student order tracking page similarly polls or refreshes on page load.
- **Future enhancement** (not v1): WebSockets (Django Channels) or Server-Sent Events for true real-time push to the open dashboard tab — flag as a Phase 2 technical improvement, not required for MVP since Email/WhatsApp already solves the core "must be notified" requirement.

---

## 8. Scaling Notes (When to Move Off Free Tier)

| Component | Free Tier Limit Risk | Upgrade Trigger / Path |
|---|---|---|
| Render backend | Free tier sleeps on inactivity (cold start delay), limited compute | Upgrade to paid Render plan once consistent daily traffic exists, especially before Stage 2 expansion (Master PRD) |
| Supabase/Neon Postgres | Free tier has storage + connection limits | Monitor DB size (file metadata + orders grow steadily, files themselves are in Cloudinary/S3 not DB) and connection count; upgrade tier when nearing cap |
| Cloudinary/S3 | Free tier storage/bandwidth cap | Implement file retention/deletion policy (Master PRD Section 8 — privacy) which also helps control storage cost; monitor usage dashboard |
| Vercel | Generous free tier for frontend, rarely the bottleneck early | Low priority |
| Celery/Redis | Not needed until: notification volume causes request latency (sending email/WhatsApp synchronously blocks the request), or scheduled jobs (shop status reminders) need reliable cron-like execution | Introduce when synchronous notification sending starts measurably slowing down order placement, or when reminder scheduling outgrows Django's basic cron/management-command-on-schedule approach |
| WhatsApp API | Provider-specific rate limits/costs at volume | Revisit provider choice/pricing tier once order volume justifies it |

**General principle for AI agents/devs**: Don't pre-optimize for scale that doesn't exist yet. Build clean interfaces (especially around notifications and file storage) so upgrading the underlying implementation later doesn't require rewriting business logic — but don't add Celery, WebSockets, or microservices prematurely.

---

## 9. API Surface (high-level, not exhaustive — full spec to be maintained in code via DRF browsable API / OpenAPI schema)

```
Auth
  POST   /api/auth/register/student/
  POST   /api/auth/register/shop/
  POST   /api/auth/login/
  POST   /api/auth/token/refresh/
  POST   /api/auth/verify-email/

Shops (public + shop-owner-scoped)
  GET    /api/shops/                     # public list, filterable by city/area/status
  GET    /api/shops/<id>/                # public shop detail incl. price list
  PATCH  /api/shops/me/                  # shop owner updates own profile
  PATCH  /api/shops/me/status/           # toggle open/closed/holiday
  PUT    /api/shops/me/price-list/       # update pricing

Orders
  POST   /api/orders/                    # student creates order (pre-payment)
  GET    /api/orders/                    # list — scoped by role (student sees own, shop sees own, admin sees all)
  GET    /api/orders/<id>/                # order detail incl. status history
  PATCH  /api/orders/<id>/status/        # shop owner updates status (accept/reject/printing/ready/collected)

Payments
  POST   /api/payments/create-razorpay-order/
  POST   /api/payments/webhook/razorpay/  # server-to-server, signature-verified
  GET    /api/payments/<order_id>/status/

Notifications
  GET    /api/notifications/me/           # in-app notification feed

Super Admin
  GET    /api/admin/shops/pending/
  PATCH  /api/admin/shops/<id>/approve/
  GET    /api/admin/orders/
  GET    /api/admin/transactions/
  GET    /api/admin/analytics/summary/
```

---

## 10. Environment & Config Management

- All secrets (Razorpay keys, Cloudinary/S3 credentials, Brevo SMTP credentials, WhatsApp API tokens, Django `SECRET_KEY`, DB connection string) via environment variables — **never committed to source control**. Use `.env` locally (gitignored) and Render/Vercel's environment variable dashboards in deployed environments.
- Separate settings for `development`, `staging` (optional), and `production` (e.g., `DEBUG=False` in production, allowed hosts locked down, HTTPS enforced).
- `django-environ` or similar recommended for clean env var loading in Django settings.

---

## 11. Cross-References

- Database schema for all models referenced above: `02_DATABASE_DESIGN.md`
- Payment webhook security, Razorpay signature verification detail: `03_CYBERSECURITY_PAYMENT_SAFETY.md`
- Security hardening checklist for this architecture: `04_SECURITY_AUDIT_HARDENING_PLAN.md`
- Build sequencing/sprints for the above modules: `05_PROJECT_PLAN_TASKS.md`
