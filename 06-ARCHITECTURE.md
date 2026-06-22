# PrintKarDoBhaiya — System Architecture & AI Agent Guide

> **Read this file first.** Every other doc in this project assumes you've read this one. If you are an AI coding agent (Claude Code, Cursor, Copilot, etc.) picking up this project, this file tells you what the system is, how its pieces fit together, and what rules you must not break.

---

## 1. What This Project Is

PrintKarDoBhaiya is a web platform that connects **students** who need documents printed with **local print shops**, cutting out the need to physically visit a shop, wait in line, or explain specifications in person.

**Core flow:**
1. Student uploads a file (PDF/image/doc) they want printed.
2. Student selects print specification (color / black & white, copies, etc.) and picks an open print shop.
3. Student can leave a comment/note for the shop (e.g., "staple it", "double-sided").
4. System calculates price automatically based on that shop's listed per-page pricing (platform takes no cut, for now).
5. Student is redirected to Razorpay to pay.
6. On successful payment, an order is created and sent to the selected shop.
7. Shopkeeper gets notified instantly via **Email + WhatsApp** (no manual refresh/checking needed).
8. Shopkeeper updates order status through stages: `Placed → Accepted/Rejected → Printing → Ready for Collection`.
9. Student gets notified at each major status change, especially "ready to collect".
10. Both student and shopkeeper have their own portal/profile to track order history, payment history, and status.
11. A **Super Admin** portal oversees all shops, all orders, all transactions platform-wide.

**Business model (current phase):** No platform fee. Students pay shops directly via Razorpay (shop receives the full amount — see note on settlement in `06-API-AND-HOSTING.md`). Monetization will be introduced later once traffic justifies it (see `04-SEO-AND-BUSINESS.md`).

---

## 2. The Three User Roles

This is the most important mental model for this entire system. Every feature, permission check, and API endpoint exists to serve one of these three roles.

### Role 1: Student (Customer)
- Signs up / logs in to a **Student Portal**.
- Uploads files, selects shop + spec, pays, tracks orders.
- Sees: order history, current order status, payment history, unique Order ID per order.
- Receives notifications: order confirmed, accepted/rejected, ready for collection.

### Role 2: Shopkeeper (Print Shop Owner)
- Signs up / logs in to a **Shop Portal**.
- One account = one shop profile (pricing, shop hours, open/closed status).
- Sees: incoming orders, must Accept/Reject, must mark Printing → Ready.
- Must toggle shop **Open/Closed/Holiday** status — if Closed, shop is not selectable by students.
- Receives notifications: new order placed (email + WhatsApp), reminder to update shop status if not done in a while.

### Role 3: Super Admin (You / Platform Owner)
- One or few accounts, not self-signup — created manually via Django admin or a seed script.
- Sees **everything**: all shops, all orders, all transactions, can activate/deactivate shops, resolve disputes.
- This is largely powered by **Django Admin**, customized — see `02-API-CODING-GUIDE.md`.

> **Rule for AI agents:** Every model, serializer, and view you write must be conscious of *which role(s)* can access it. Never write an endpoint that exposes another user's order, file, or payment data. Use Django REST Framework permission classes per-role, not just `IsAuthenticated`.

---

## 3. High-Level System Diagram (textual)

```
[ React Frontend (Vercel) ]
        |
        |  REST API calls (JSON, JWT auth)
        v
[ Django + DRF Backend (Render) ] -------- [ PostgreSQL (Supabase/Neon) ]
        |              |        |
        |              |        +--> [ Cloudinary/S3 ] (uploaded files)
        |              |
        |              +--> [ Razorpay API ] (payment + webhook)
        |
        +--> [ Email (Brevo SMTP) ]
        +--> [ WhatsApp (Meta Cloud API / Gupshup) ]
```

**Key principle:** The frontend never talks to Razorpay, Cloudinary, Email, or WhatsApp directly for anything sensitive. The Django backend is the single source of truth and the only thing that talks to third-party services with secret keys. The frontend only ever talks to *our* API.

---

## 4. Core Data Models (conceptual, not final code)

This is the relational shape of the system. Exact Django models will live in `02-API-CODING-GUIDE.md`, but the *relationships* below must not change without updating all docs.

- **User** (Django's built-in auth user, extended) — has a `role`: `student` / `shopkeeper` / `admin`.
- **StudentProfile** — 1:1 with User (role=student). Holds phone number, college/contact info.
- **ShopProfile** — 1:1 with User (role=shopkeeper). Holds shop name, address, pricing (per page B&W, per page color, etc.), open/closed/holiday status, WhatsApp number, last-status-updated timestamp.
- **Order** — the central model.
  - belongs to one StudentProfile
  - belongs to one ShopProfile
  - has uploaded file reference (Cloudinary/S3 URL)
  - has spec: color/B&W, number of copies, page count, comment/note from student
  - has calculated price (computed server-side, never trusted from frontend)
  - has unique `order_id` (human-readable, e.g. `PKB-2026-000123`)
  - has `status`: `pending_payment → placed → accepted/rejected → printing → ready_for_collection → collected`
  - has timestamps for each status transition (for history/audit)
- **Payment** — belongs to one Order. Stores Razorpay order ID, payment ID, signature, amount, status (success/failed/refunded).
- **StatusHistory** — belongs to one Order. Every status change is logged here (who changed it, when, from what, to what) — this is what powers "order history" views and dispute resolution for the Super Admin.
- **NotificationLog** — records every email/WhatsApp sent (to whom, what type, success/failure) — important for debugging "I didn't get notified" complaints.

> **Rule for AI agents:** Price is *always* calculated server-side at order-creation time from the ShopProfile's current pricing, never accepted as a value from the frontend. This prevents students from manipulating prices via browser dev tools.

---

## 5. Order Status State Machine

This is the backbone of the whole product. Both portals are essentially different views into this state machine.

```
pending_payment
      |
      v  (Razorpay payment success webhook/callback)
   placed  ---------------------------> (shopkeeper notified: email + WhatsApp)
      |
      v  (shopkeeper action)
  accepted  or  rejected
      |              |
      v              v
  printing      (student notified: rejected, refund flow — see 06-API doc)
      |
      v  (shopkeeper ticks "printed" checkbox)
ready_for_collection ---------------------------> (student notified: email + WhatsApp)
      |
      v  (optional, shopkeeper marks collected, or auto after N days)
  collected
```

> **Rule for AI agents:** Never allow a status to move backward except via an explicit admin override (logged in StatusHistory with a reason). Never skip `placed` even if payment and acceptance feel instantaneous — every transition must be a real, logged row.

---

## 6. Shop Availability Rule (Important Business Rule)

A shop can only be **selected by a student** if its current status is `open`. If `closed` or `holiday`, the shop must:
- Not appear as selectable in the shop-picker UI (it can still appear, grayed out, with a reason — see `03-FRONTEND-SPEC.md`), or be filtered out entirely (decide in frontend spec).
- Reject any order-creation attempt server-side too — **never trust the frontend filter alone.** A direct API call to create an order against a closed shop must be rejected by the backend with a clear error.

Shopkeepers who don't update their status for a configurable interval (e.g., every morning by 9 AM, or every 24 hours) get an automated email reminder. See `06-API-AND-HOSTING.md` for the scheduled job that powers this.

---

## 7. Notification Principles

- Notifications are **push, not pull**. Nobody should ever need to "refresh" or "check" for updates — the system emails and WhatsApps both parties at the right moments.
- Triggered via **Django signals** on Order/Payment status changes — not by frontend polling, not by cron jobs guessing what changed (cron is only used for the "shop hasn't updated status" reminder, which is a true time-based check).
- Every notification attempt is logged in `NotificationLog`, including failures, so the Super Admin can debug "shopkeeper says they never got notified."
- Email and WhatsApp are sent **asynchronously** (not blocking the HTTP request/response cycle) — see `06-API-AND-HOSTING.md` for how this is done affordably without a heavy task queue like Celery+Redis (since budget is ₹0 initially).

---

## 8. Non-Negotiable Rules for Any AI Agent Working on This Codebase

1. **Never trust the frontend for price, status, or ownership.** Always recompute/verify server-side.
2. **Every order status change must be logged** in `StatusHistory`. No silent updates.
3. **Role separation is enforced at the API layer**, not just hidden in the UI. A student must never be able to fetch another student's order via API even if they guess the ID.
4. **Payments are verified via Razorpay signature verification server-side** before an order is marked `placed`. Never mark an order paid based on a frontend "payment successful" message alone.
5. **File uploads are validated** for type and size before being sent to Cloudinary/S3 (no `.exe`, no 500MB files).
6. **All secrets (Razorpay keys, Cloudinary keys, WhatsApp API tokens, DB credentials) live in environment variables**, never hardcoded, never committed to git. See `06-API-AND-HOSTING.md`.
7. **Read `05-WORK-LOG.md` before starting any new work session**, and update it after finishing meaningful work. This is the project's memory across sessions — skipping this causes duplicate or conflicting work.
8. **Don't invent new user roles or status states** without updating this file and `05-WORK-LOG.md`. The state machine in Section 5 is the contract the whole system depends on.

---

## 9. Glossary

| Term | Meaning |
|---|---|
| Shop | A print shop registered on the platform, run by a Shopkeeper |
| Spec | The printing specification chosen by student (color/B&W, copies, etc.) |
| Order ID | Unique human-readable ID per order, e.g. `PKB-2026-000123` |
| Super Admin | Platform owner's account, sees everything across all shops |
| Ready for Collection | Status meaning the print is done and student can come pick it up |
| Platform fee | Currently ₹0 — student pays shop's listed price directly |

---

## 10. Document Map

| File | Purpose |
|---|---|
| `01-ARCHITECTURE.md` | This file — system overview, roles, data model, rules |
| `02-API-CODING-GUIDE.md` | Concrete API endpoints, hosting setup, deployment steps |
| `03-FRONTEND-SPEC.md` | React frontend pages, components, user flows |
| `04-SEO-AND-BUSINESS.md` | SEO, growth, future monetization, feature roadmap |
| `05-WORK-LOG.md` | Running log of what's done, what's in progress, what's next |
| `06-README.md` | Plain-English explainer of the product for humans/stakeholders |
