# PrintKarDoBhaiya — API, Coding & Hosting Guide

> Read `01-ARCHITECTURE.md` first. This file translates that architecture into concrete Django apps, API endpoints, and the steps to actually host this for ₹0–low cost.

---

## 1. Django Project Structure (Recommended)

```
printkardobhaiya/
├── config/                 # Django project settings, urls, wsgi/asgi
├── accounts/                # Custom User model, auth, role logic
├── shops/                    # ShopProfile, pricing, open/closed status
├── orders/                  # Order, StatusHistory, price calculation
├── payments/               # Razorpay integration, Payment model
├── notifications/          # Email + WhatsApp sending, NotificationLog
├── adminpanel/              # Super admin custom views (beyond default Django admin)
├── manage.py
└── requirements.txt
```

Each app should have: `models.py`, `serializers.py`, `views.py`, `permissions.py`, `urls.py`, `signals.py` (where relevant), `tests.py`.

> **Why separate apps instead of one big app?** Keeps role-based logic isolated. An AI agent fixing a bug in `payments/` shouldn't need to touch `shops/`. Reduces accidental cross-contamination of logic.

---

## 2. Core Models (concrete)

### `accounts/models.py`
```
User (extends AbstractUser)
  - role: choices = ['student', 'shopkeeper', 'admin']
  - phone_number
  - is_verified (for future phone/email OTP verification)
```

### `shops/models.py`
```
ShopProfile
  - user (OneToOne -> User, role=shopkeeper)
  - shop_name
  - address
  - price_per_page_bw (decimal)
  - price_per_page_color (decimal)
  - status: choices = ['open', 'closed', 'holiday']
  - whatsapp_number
  - last_status_update (datetime, auto-updated)
  - created_at
```

### `orders/models.py`
```
Order
  - order_id (unique, auto-generated, human-readable: PKB-YYYY-NNNNNN)
  - student (FK -> StudentProfile)
  - shop (FK -> ShopProfile)
  - file_url (Cloudinary/S3 URL)
  - original_filename
  - print_type: choices = ['bw', 'color']
  - copies (int)
  - page_count (int)
  - comment (text, optional, student's note to shop)
  - calculated_price (decimal, server-computed, never from frontend)
  - status: choices = ['pending_payment', 'placed', 'accepted', 'rejected',
                        'printing', 'ready_for_collection', 'collected']
  - created_at
  - updated_at

StatusHistory
  - order (FK -> Order)
  - from_status
  - to_status
  - changed_by (FK -> User, nullable for system-triggered changes)
  - changed_at
  - reason (text, optional — required for admin overrides)
```

### `payments/models.py`
```
Payment
  - order (OneToOne -> Order)
  - razorpay_order_id
  - razorpay_payment_id (nullable until paid)
  - razorpay_signature (nullable until verified)
  - amount
  - status: choices = ['created', 'success', 'failed', 'refunded']
  - created_at
```

### `notifications/models.py`
```
NotificationLog
  - order (FK -> Order, nullable for non-order notifications e.g. shop status reminder)
  - recipient_user (FK -> User)
  - channel: choices = ['email', 'whatsapp']
  - notification_type (e.g. 'order_placed', 'order_ready', 'status_reminder')
  - status: choices = ['sent', 'failed']
  - sent_at
  - error_message (nullable)
```

---

## 3. API Endpoints

All endpoints prefixed `/api/v1/`. Auth via JWT (use `djangorestframework-simplejwt`).

### Auth
| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| POST | `/auth/register/student/` | Public | Student signup |
| POST | `/auth/register/shopkeeper/` | Public | Shopkeeper signup (may require admin approval before going live — your call) |
| POST | `/auth/login/` | Public | Returns JWT access + refresh token |
| POST | `/auth/refresh/` | Public | Refresh JWT |
| GET | `/auth/me/` | Authenticated | Returns current user + role |

### Shops
| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| GET | `/shops/` | Student | List shops, filterable by `?status=open`, includes pricing |
| GET | `/shops/<id>/` | Student | Shop detail |
| GET | `/shops/me/` | Shopkeeper | Own shop profile |
| PATCH | `/shops/me/` | Shopkeeper | Update own pricing/details |
| PATCH | `/shops/me/status/` | Shopkeeper | Update open/closed/holiday — **this also resets `last_status_update`** |

### Orders
| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| POST | `/orders/calculate-price/` | Student | Given shop_id + spec, returns calculated price (preview, before payment) |
| POST | `/orders/` | Student | Create order (status=`pending_payment`), triggers Razorpay order creation, returns Razorpay order ID for frontend checkout |
| GET | `/orders/` | Student | List own orders |
| GET | `/orders/<order_id>/` | Student/Shopkeeper (if owner) | Order detail — permission checks both directions |
| GET | `/orders/shop-orders/` | Shopkeeper | List orders for own shop |
| PATCH | `/orders/<order_id>/accept/` | Shopkeeper | Accept order → status `accepted` |
| PATCH | `/orders/<order_id>/reject/` | Shopkeeper | Reject order → status `rejected`, triggers refund flow |
| PATCH | `/orders/<order_id>/mark-printing/` | Shopkeeper | → status `printing` |
| PATCH | `/orders/<order_id>/mark-ready/` | Shopkeeper | → status `ready_for_collection`, triggers student notification |
| PATCH | `/orders/<order_id>/mark-collected/` | Shopkeeper | → status `collected` |

### Payments
| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| POST | `/payments/verify/` | Student (via frontend after Razorpay checkout) | Verifies Razorpay signature server-side, marks Payment success, moves Order to `placed`, triggers shopkeeper notification |
| POST | `/payments/webhook/` | Razorpay (server-to-server) | Backup webhook in case frontend callback fails — **critical for reliability**, see Section 6 |

### Admin (Super Admin only)
| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| GET | `/admin/shops/` | Admin | All shops, with activate/deactivate action |
| GET | `/admin/orders/` | Admin | All orders platform-wide, filterable |
| GET | `/admin/transactions/` | Admin | All payments, filterable by date/shop/status |
| PATCH | `/admin/shops/<id>/deactivate/` | Admin | Suspend a shop |

> Much of the Super Admin's needs can be satisfied by **customizing Django Admin** (`adminpanel/admin.py`) rather than building a separate React admin UI — this saves significant time. Use `list_display`, `list_filter`, `search_fields`, and custom admin actions. Build a separate React-based admin dashboard only if you want nicer charts/UX later.

---

## 4. Price Calculation Logic (Server-Side Only)

```
price = (page_count × copies × per_page_rate) 
where per_page_rate = shop.price_per_page_color if print_type == 'color' 
                       else shop.price_per_page_bw
```

This calculation must live in a single shared function (e.g. `orders/services.py::calculate_order_price()`) used by both the preview endpoint and the actual order-creation endpoint, so they can never drift out of sync.

Page count detection: for V1, ask the student to manually enter page count, or auto-detect from PDF using `PyPDF2`/`pypdf` server-side after upload (recommended — removes a source of error/fraud). Decide and document this choice in `05-WORK-LOG.md` once implemented.

---

## 5. Razorpay Integration Flow

1. Student finalizes spec + shop → frontend calls `POST /orders/` with order details (no price — backend computes it).
2. Backend creates `Order` (status=`pending_payment`) and a corresponding Razorpay Order via Razorpay's `/v1/orders` API, storing `razorpay_order_id` in `Payment`.
3. Backend returns `razorpay_order_id`, `amount`, and Razorpay's public key to frontend.
4. Frontend opens Razorpay Checkout widget with these details.
5. On success, Razorpay returns `razorpay_payment_id` + `razorpay_signature` to frontend.
6. Frontend sends these to `POST /payments/verify/`.
7. Backend verifies the signature using Razorpay's official Python SDK (`razorpay.Utility.verify_payment_signature`) — **never trust the frontend's "success" message alone.**
8. On valid signature: `Payment.status = 'success'`, `Order.status = 'placed'`, log `StatusHistory`, trigger shopkeeper notification (email + WhatsApp) via signal.
9. **Also implement the Razorpay webhook** (`/payments/webhook/`) as a safety net — if the user closes the browser tab right after paying but before step 6 completes, the webhook ensures the order still gets marked paid. This is a known real-world failure mode; don't skip it.

**On rejection by shopkeeper:** trigger a refund via Razorpay's refund API (`razorpay.payment.refund(payment_id, amount)`), update `Payment.status = 'refunded'`, notify student.

---

## 6. Notifications Without Celery/Redis (Budget-Friendly)

Celery + Redis is the "correct" production answer for async tasks, but costs money to host (a worker + a Redis instance) and adds complexity. For a ₹0-budget V1:

**Option A (Recommended for V1):** Use Django's `transaction.on_commit()` + a lightweight background thread, or simply send emails/WhatsApp messages synchronously within the signal handler. Since these are quick HTTP calls (Brevo/Meta API), the delay added to the request (typically <1s) is acceptable for an app at this traffic scale. Document this as a known scaling limitation in `05-WORK-LOG.md`.

**Option B (when traffic grows):** Migrate to `django-rq` (uses Redis but lighter than Celery) or actual Celery + Redis, both available as free/cheap add-ons on Render. Don't build this until you actually need it — adding it prematurely costs you setup time and a small monthly Redis fee for no benefit at low traffic.

**Shop status reminder job:** Use `django-crontab` or, since Render's free tier doesn't run persistent cron easily, use **Render Cron Jobs** (a paid-but-cheap feature) or a free external pinger like **cron-job.org** hitting a protected Django endpoint (e.g. `/internal/check-shop-status-reminders/`) on a schedule, which then checks every ShopProfile's `last_status_update` and emails shopkeepers who haven't updated in the configured window.

---

## 7. Email & WhatsApp Setup

**Email:** Use [Brevo](https://www.brevo.com) (formerly Sendinblue) — free tier gives 300 emails/day, which is plenty for a starting platform. Configure as Django's `EMAIL_BACKEND` using SMTP credentials, or use their transactional API.

**WhatsApp:** Two realistic free/cheap options:
- **Meta WhatsApp Cloud API** directly — free tier includes a generous number of free conversations per month, but requires Meta Business verification, which takes some setup time.
- **Gupshup** or **Interakt** — wrapper services with easier onboarding, free trial tiers, then pay-as-you-go. Good for getting started fast while you sort out Meta verification in parallel.

Document whichever you actually set up, with the working credentials flow (not the actual secrets), in this file once implemented.

---

## 8. File Upload Handling

- Frontend uploads file directly to backend (not directly to Cloudinary from browser, to keep validation server-side) — backend validates file type (`.pdf`, `.doc`, `.docx`, `.jpg`, `.png` — decide final allowed list) and size limit (e.g. max 20MB) **before** forwarding to Cloudinary/S3.
- Store only the returned secure URL in `Order.file_url`, not the file itself, in your database.
- Set file uploads on Cloudinary/S3 to **private/authenticated access** if possible — you don't want random people guessing URLs to other students' documents. Use signed URLs with expiry for shopkeeper file access.

---

## 9. Hosting & Deployment Guide

### 9.1 Database — Supabase or Neon (pick one)
1. Create a free project on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
2. Copy the PostgreSQL connection string.
3. In Django `settings.py`, use `dj-database-url` to parse it from an environment variable `DATABASE_URL`.

### 9.2 Backend — Render
1. Push your Django project to a GitHub repo.
2. On [Render](https://render.com), create a new **Web Service**, connect the repo.
3. Build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
4. Start command: `gunicorn config.wsgi:application`
5. Add environment variables in Render's dashboard: `DATABASE_URL`, `SECRET_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CLOUDINARY_URL`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `WHATSAPP_API_TOKEN`, `DEBUG=False`, `ALLOWED_HOSTS`.
6. Use Render's free tier to start (note: free tier spins down when idle and takes ~30s to wake — acceptable for V1, document if this becomes a UX issue).

### 9.3 Frontend — Vercel
1. Push your React (Vite) project to a GitHub repo (can be the same monorepo or separate — your call, document the choice).
2. Import the repo on [Vercel](https://vercel.com).
3. Set environment variable `VITE_API_BASE_URL` pointing to your Render backend URL.
4. Vercel auto-deploys on every push to `main`.

### 9.4 File Storage — Cloudinary
1. Free account on [Cloudinary](https://cloudinary.com).
2. Use `django-cloudinary-storage` package, configure `CLOUDINARY_URL` env variable.

### 9.5 Domain
- Buy `printkardobhaiya.com` (or `.in`) from a registrar (Namecheap, GoDaddy, or Indian registrars like BigRock).
- Point it to Vercel (frontend) and use a subdomain like `api.printkardobhaiya.com` for the Render backend.

---

## 10. Environment Variables Checklist

```
# Django
SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=

# Database
DATABASE_URL=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Cloudinary
CLOUDINARY_URL=

# Email (Brevo)
EMAIL_HOST=
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_PORT=

# WhatsApp
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# Frontend (Vercel)
VITE_API_BASE_URL=
VITE_RAZORPAY_KEY_ID=
```

**Never commit a `.env` file with real values to git.** Use `.env.example` with empty/placeholder values instead, and add `.env` to `.gitignore`.

---

## 11. Security Checklist Before Going Live

- [ ] Razorpay payment signature verification implemented and tested
- [ ] Razorpay webhook implemented as backup to frontend callback
- [ ] File upload type/size validation in place
- [ ] All order/payment endpoints check `request.user` owns the resource
- [ ] CORS configured to only allow your actual frontend domain (not `*`)
- [ ] `DEBUG=False` in production
- [ ] Rate limiting on auth endpoints (e.g. `django-ratelimit`) to prevent brute force
- [ ] HTTPS enforced (Render/Vercel do this by default)
- [ ] Secrets rotated if ever accidentally committed to git history
