# PrintKarDoBhaiya — Master Product Requirements Document (PRD)

> **Purpose of this file**: This is the single entry point for any human contributor or AI coding agent working on this project. Read this file first. It links out to all other technical docs. If something in another doc contradicts this file, this file wins unless the other doc is more recently updated and dated.

> **Doc set**: This file is part of a 6-file documentation set.
> 1. `00_MASTER_PRD.md` (this file) — product, business, launch, SEO, risk
> 2. `01_SYSTEM_DESIGN_ARCHITECTURE.md` — technical architecture, stack, data flow
> 3. `02_DATABASE_DESIGN.md` — schema, models, relationships, migrations strategy
> 4. `03_CYBERSECURITY_PAYMENT_SAFETY.md` — security posture, payment safety, attack surface
> 5. `04_SECURITY_AUDIT_HARDENING_PLAN.md` — audit checklist, hardening roadmap, pen-test plan
> 6. `05_PROJECT_PLAN_TASKS.md` — work done, work remaining, sprints, backlog

---

## 1. What Is This Product

**PrintKarDoBhaiya** ("Print kar do bhaiya" — Hindi/Hinglish for "Hey bro, get this printed") is a local, campus/city-focused online printing marketplace that connects **students (or any customer)** with **local print shops**.

A student uploads a file (PDF, DOCX, image, etc.), chooses print specifications (color/B&W, paper size, number of copies, binding, etc.), picks a **specific print shop** from a list of partnered shops (only shops currently marked "Open" are selectable), adds optional notes/comments for the shop, sees an auto-calculated price (based on that shop's own price list — **no platform commission/fee**), pays via **Razorpay**, and the order is placed directly with the chosen shop.

The shop owner gets the order instantly — no manual checking needed — via **website dashboard + Email + WhatsApp notification**. The shop updates the order status (Placed → Accepted/Rejected → Printing → Ready for Collection) on their dashboard. The moment status changes to "Ready," the student is notified the same way (website + Email + WhatsApp).

Both students and shopkeepers get their own **portal/profile**:
- **Student portal**: order history, order tracking by unique Order ID, payment history, current order status.
- **Shop portal**: incoming orders queue, order status management, shop open/closed/holiday toggle, price list management, order/earnings history.
- **Super Admin portal**: oversee all shops, all orders, all transactions, approve/manage/suspend shops, view platform-wide analytics.

### What this is NOT (at least not in v1)
- Not a delivery service — it's **pickup/collection only** in v1 (shop premises).
- Not a marketplace that takes a cut/commission in v1 (see Section 4 — Monetization).
- Not a generic e-commerce/print-on-demand merchandise store (no t-shirts, mugs, etc.) — strictly **document printing** (assignments, projects, resumes, photocopies, spiral binding, etc.) in v1.
- Not a multi-city logistics platform — starts hyperlocal (one city/campus cluster) and expands.

---

## 2. Why This Product (Problem & Motivation)

### The problem today
- Students near colleges routinely need to print assignments, projects, reports — often last-minute, often in bulk, often with specific binding/color requirements.
- Today this is entirely **offline and manual**: walk/ride to the shop, wait in a queue, explain specs verbally, pay cash, wait for printing, come back to collect. If the shop is closed, busy, or the queue is long, the student has wasted a trip.
- Shopkeepers have no visibility into upcoming demand — they only know an order exists once the customer is physically present.
- During peak periods (exam submissions, project deadlines), shops get overwhelmed, customers get frustrated, and there is no order-tracking or accountability if a job is delayed or mishandled.
- There is no existing dominant hyperlocal platform solving this specific niche (B&W/color document printing matched to nearby shop, with order tracking) in most Indian college towns — most students rely on word-of-mouth "yeh dukaan acchi hai" (this shop is good) reputation only.

### Why now
- Smartphone + UPI/Razorpay penetration among Indian students is near-universal — frictionless digital payment is no longer a barrier.
- WhatsApp is already the default communication channel for both students and small shop owners in India — meeting them where they already are removes adoption friction.
- Print shops are small businesses with thin margins; a **zero-commission model at launch** removes their main objection ("why should I pay you to get my own customers").

### Who benefits
| Stakeholder | Benefit |
|---|---|
| Student | No physical queue, can compare/select shop, track status, pay digitally, get notified when ready — saves time and trips |
| Shop owner | Orders come pre-specified (no back-and-forth), gets notified instantly without checking app constantly, can manage queue better, gets a "digital storefront" presence, zero cost to join initially |
| Platform (you) | Builds a transaction-data asset and two-sided network (students + shops) in a niche with low existing competition, with a credible path to monetize later (Section 4) |

---

## 3. How It Works (User Flows)

### 3.1 Student Flow
1. Student signs up / logs in (student portal account).
2. Student uploads file(s) to print (PDF/DOCX/image; size limits enforced — see `01_SYSTEM_DESIGN_ARCHITECTURE.md`).
3. Student selects print specifications:
   - Color or Black & White
   - Paper size (A4/A3/Letter, etc.)
   - Number of copies
   - Single/Double-sided
   - Binding type (spiral, stapled, none), if offered by shop
4. Student browses the **list of partner shops**. **Only shops currently flagged "Open"** are selectable for order placement; closed/holiday shops are shown as visible-but-disabled (so students know they exist but can't order from them right now).
5. Student selects a shop. System fetches **that shop's own price list** and auto-calculates total price (pages × per-page rate by color mode × copies + any binding charge). **No platform fee is added.**
6. Student can add a free-text comment/instruction for the shop (e.g., "please staple top-left," "double-sided please," "urgent, need by 5pm").
7. Student reviews order summary → proceeds to pay → redirected to **Razorpay Checkout**.
8. On successful payment, order is created in the system with status `PLACED` and a **unique Order ID**, and is pushed to the selected shop's dashboard. On payment failure/cancellation, no order is created (or order is created in a `PAYMENT_FAILED` state — see architecture doc — and student can retry).
9. Student can track status in real time on their portal: `Placed → Accepted/Rejected → Printing → Ready for Collection → Collected`.
10. Student receives notifications (Website + Email + WhatsApp) at key transitions, especially **order accepted/rejected** and **ready for collection**.
11. Student collects the printed material from the shop in person and (optionally) the shop marks it `Collected`.

### 3.2 Shopkeeper Flow
1. Shop owner signs up; account is **verified/approved by Super Admin** before going live (prevents fake/spam shop listings).
2. Shop owner sets up shop profile: shop name, address, contact, **price list** (per-page B&W rate, per-page color rate, binding charges, etc.), and operating hours.
3. Shop owner toggles shop status: **Open / Closed / On Holiday**. This directly controls whether students can select the shop for new orders.
4. New order arrives → shop owner is notified instantly via **Email + WhatsApp** (no need to keep checking the dashboard) and sees it appear in their **order queue** on the dashboard.
5. Shop owner reviews the order (files, specs, comments) and **Accepts or Rejects** it (rejection reason optional, e.g., "machine down," "can't do this binding type").
6. On acceptance, shop owner prints the job, and **ticks a checkbox / updates status** on the dashboard to `Printing` → `Ready for Collection`.
7. The moment status is set to `Ready for Collection`, the **student is auto-notified** (Website + Email + WhatsApp).
8. Shop owner can view their own order history, completed orders, and (later) earnings reports.
9. **Reminder system**: if a shop owner hasn't updated their open/closed status within a defined interval (e.g., hasn't confirmed status for the day by a cutoff time), they get a reminder email prompting them to update it — so stale "Open" statuses don't mislead students.

### 3.3 Super Admin Flow
1. Logs into a separate **Super Admin portal**.
2. Approves/rejects new shop signups.
3. Views/manages all shops (suspend, edit, deactivate).
4. Views all orders across all shops (status, value, timestamps).
5. Views all transactions/payments (via Razorpay records reconciled in-system).
6. Basic platform analytics: orders/day, active shops, GMV (Gross Merchandise Value), most active shops, failed payments, etc.
7. Handles disputes/escalations (e.g., student says "I paid but shop says no order received").

---

## 4. Monetization Strategy

### Phase 1 (Launch) — No Platform Fee
- Explicit decision: **0% commission, 0 platform fee** to students or shops at launch.
- Goal: maximize shop sign-ups and student adoption with zero friction/objection. Shops keep 100% of what they already charge; students pay only what the shop would have charged them anyway (no markup).
- This is a deliberate **loss-leader / market-capture phase** — the cost is engineering + hosting time, not cash subsidies, since hosting stack is free-tier (see architecture doc).

### Phase 2 (Post-Traction) — Monetize once there is real usage
Once meaningful order volume and shop density exist (suggested trigger: e.g., 15–20 active shops + consistent weekly order volume across multiple weeks — exact thresholds to be decided by founder based on real data), introduce **one or more** of:
1. **Small per-transaction platform fee** (e.g., flat ₹X or 2-5%) — communicated transparently to shops in advance, ideally grandfathering early shops with a discount/loyalty rate.
2. **Shop subscription/premium tier** — featured placement, analytics dashboard, priority support, multiple-branch management.
3. **Student-side convenience add-ons** — rush/priority printing fee (paid to platform, not shop), express slots.
4. **Advertising** — promoted shop placement in listings (clearly labeled as promoted, not deceptive).
5. **B2B/bulk** — partnerships with college administrations for official bulk printing (admission forms, notices) at negotiated rates.
6. **Data/insights** (careful/ethical) — aggregated, anonymized demand insights sold back to shop owners only with consent (e.g., "busiest days are X").

> AI agents/devs: do not hardcode "always free" anywhere in business logic. Build the pricing engine (see `02_DATABASE_DESIGN.md`) so a **platform fee field exists from day one but defaults to 0** — this avoids a painful migration later.

---

## 5. Tools & Source (Tech Stack Summary)

> Full technical detail lives in `01_SYSTEM_DESIGN_ARCHITECTURE.md`. Summary here for product-level context.

| Layer | Choice | Notes |
|---|---|---|
| Backend | Django + Django REST Framework (Python) | Admin panel out-of-box helps Super Admin portal MVP |
| Database | PostgreSQL | Hosted free-tier on Supabase or Neon |
| Frontend | React (Vite) | Deployed on Vercel |
| File Storage | Cloudinary or AWS S3 (free tier) | Stores uploaded print files (PDFs/images/docs) |
| Payments | Razorpay | Checkout + webhooks for payment confirmation |
| Notifications — Email | SMTP via Brevo (free tier) | Transactional emails |
| Notifications — WhatsApp | Meta WhatsApp Cloud API (preferred, free tier available) or Gupshup as fallback wrapper | Order placed, accepted/rejected, ready for collection, shop status reminder |
| Backend Hosting | Render (free/low tier) | Django app + workers |
| Frontend Hosting | Vercel (free tier) | React build |
| Async/Notifications Trigger | Django Signals (+ Celery if/when scale requires queuing — see architecture doc for when to introduce this) | |

All choices prioritize **$0 or near-$0 monthly cost at launch scale**, consistent with the "don't earn yet" phase.

---

## 6. Launch Plan

### Stage 0 — Pre-launch (Build)
- Build MVP per `05_PROJECT_PLAN_TASKS.md`.
- Onboard a **small seed set of print shops manually** (founder personally visits/calls 5–10 shops near one campus/area) before public student launch. Cold-start problem: students won't come if there are no shops; solve shop-side first.
- Each seed shop gets manual onboarding help (founder enters their price list for them if needed) to remove friction.

### Stage 1 — Soft Launch (Single Campus/Area)
- Launch to one campus or one local market area only.
- Promote via: college WhatsApp groups, class representatives, posters near the partnered shops themselves ("Order online, skip the queue — scan to try"), Instagram page for the campus.
- Goal: prove the core loop works end-to-end (upload → pay → shop fulfills → student notified → collected) reliably, with real money, for at least 2-4 weeks.
- Actively collect feedback from both shopkeepers and students (a simple feedback form or WhatsApp number is enough initially).

### Stage 2 — Local Expansion
- Once Stage 1 loop is stable and shop owners are satisfied (low rejection rate, fast turnaround, no payment disputes), expand to more shops in the same city, then adjacent campuses/cities.
- Start light SEO + social presence (Section 7) to capture organic discovery, not just direct referral.

### Stage 3 — Monetize & Scale
- Introduce Phase 2 monetization (Section 4) once thresholds are met.
- Consider scaling infra off free tiers as load demands (see architecture doc scaling notes).

### Success Metrics to track from day one
- # active shops (Open at least X days/week)
- # orders placed/week
- Order completion rate (Placed → Collected) vs. rejection/abandon rate
- Avg time from order placed → ready for collection
- Repeat student usage rate (retention)
- Payment failure rate

---

## 7. SEO & Traffic Management

### SEO Strategy
- **Local SEO is the primary lever** — this is a hyperlocal product. Each shop's public profile page should be indexable (e.g., `/shops/<city>/<shop-slug>`) with shop name, address, area, services offered (color/B&W, binding types), and operating hours — this lets searches like "photocopy shop near [college name]" or "online printing [city]" surface the platform.
- Google Business Profile-style structured data (schema.org `LocalBusiness` markup) on shop pages.
- Blog/content pages targeting long-tail queries students actually search: "how to print assignment online near [college]," "cheap photocopy shop near [area]," "spiral binding price near me" — written naturally, not keyword-stuffed.
- Fast page loads and mobile-first design are an SEO and conversion requirement (most student traffic will be mobile).
- Submit sitemap to Google Search Console from day one; monitor indexing.
- Unique, descriptive meta titles/descriptions per shop page and per city/area landing page.

### Traffic Acquisition (non-SEO, early-stage)
- WhatsApp group seeding (class groups, hostel groups) — highest-trust, lowest-cost channel for college audience.
- Physical posters/QR codes at the partnered shop counters themselves (the shop becomes a distribution point).
- Referral mechanic (optional, future): student gets nothing extra in v1 (no fee, so no incentive structure needed yet) — but worth designing the data model so referral tracking *could* be added later (see DB doc note).
- Campus ambassador/class rep model — one trusted student per class/hostel shares the link.

### Traffic Management (handling load)
- Free-tier infra (Render/Vercel/Supabase/Neon) has real limits (cold starts, connection limits, request quotas) — see `01_SYSTEM_DESIGN_ARCHITECTURE.md` Section on Scaling for thresholds at which to upgrade.
- Rate-limit file uploads and API endpoints to prevent abuse from exhausting free-tier quotas (also a security concern, see `03_CYBERSECURITY_PAYMENT_SAFETY.md`).
- Cache shop listing/price-list reads (these change rarely) to reduce DB load as traffic grows.

---

## 8. Risk Management & Possible Pitfalls

| Risk | Impact | Mitigation |
|---|---|---|
| Shop accepts payment but never fulfills order (no-show shop) | Student loses money/trust | Razorpay funds can be held/refund-initiated by Super Admin on dispute; build a manual refund workflow (see DB doc — refund status field) for v1; long-term consider escrow-like hold-and-release, though Razorpay route settlement makes true escrow hard at $0 cost — flag this as a known v1 limitation to communicate honestly to users (e.g., dispute resolution policy page) |
| Shop marks "Open" but is actually closed/overwhelmed | Wasted student trips/orders | Shop status reminder system (Section 3.2); allow students to see shop's recent rejection rate/turnaround time as a trust signal (future) |
| File upload abuse (huge files, malware, copyrighted/illegal content) | Storage cost blowup, legal exposure, security risk | File size/type validation, malware scanning consideration, ToS clause putting responsibility on uploader, see security docs |
| Payment fraud / fake payment claims | Financial loss, shop distrust of platform | Razorpay webhook signature verification is mandatory (never trust client-side "payment success" alone) — detailed in `03_CYBERSECURITY_PAYMENT_SAFETY.md` |
| Low shop adoption (cold start) | No supply, no demand follows | Manual, high-touch onboarding of first 5-10 shops (Stage 0); zero fee removes their main objection |
| Low student adoption / chicken-egg problem | Same as above, other side | Hyperlocal single-campus focus + WhatsApp group seeding + physical posters at shop |
| Notification delivery failure (WhatsApp API down/blocked, email in spam) | Shop misses order, SLA broken | Multi-channel redundancy (site + email + WhatsApp) is already designed in; add in-dashboard "new order" sound/badge as a non-network-dependent fallback |
| WhatsApp Business API cost/approval friction | Could block notification feature | Start with Meta Cloud API free tier; have Gupshup/similar as fallback; design notification service as a swappable interface, not hard-coded to one provider (see architecture doc) |
| Shop owner technical hesitancy (small shop owners may not be tech-savvy) | Poor shop-side adoption/usage | Keep shop dashboard extremely simple (large buttons: Accept/Reject/Ready), founder-assisted onboarding initially, WhatsApp as primary touchpoint since shop owners already use it daily |
| Disputes between student and shop (wrong print, damaged file, late) | Trust/reputation risk to platform | Clear ToS on platform's role (facilitator, not printer), comment field lets student specify clearly, Super Admin dispute-handling flow |
| Data privacy of uploaded documents (assignments may contain personal info) | Privacy/legal risk | Files auto-deleted after a retention window post-collection (policy decision — define exact window, e.g., 7-30 days), access-controlled storage, see security doc |
| Free-tier infra limits hit unexpectedly at viral moment | Downtime during a growth spike (ironic worst case) | Monitor usage against free-tier caps proactively; have a documented "upgrade path" ready (see architecture doc scaling section) so it's a quick paid upgrade, not a rebuild |
| Scope creep before MVP ships | Delayed launch, never shipping | `05_PROJECT_PLAN_TASKS.md` enforces an explicit MVP cut-line; anything beyond it is explicitly deferred, not silently added |

### Legal/Compliance Notes (non-exhaustive, consult a professional before launch)
- Terms of Service should clarify: platform is a **facilitator** connecting student and shop; the shop is responsible for print quality/fulfillment; platform is responsible for accurate order transmission and payment handling.
- Privacy Policy required (especially given file uploads + WhatsApp/email contact data) — should cover what's collected, retention period, and that Razorpay handles payment data (platform should **never** store raw card/UPI credentials — Razorpay Checkout handles this, keeping the platform out of PCI-DSS scope for card data, detailed in security doc).
- Refund Policy should be explicit and visible before checkout.

---

## 9. Out of Scope for v1 (Explicit Non-Goals)

To prevent scope creep, the following are **explicitly deferred**, not part of MVP:
- Delivery/courier of printed material (pickup only)
- Platform commission/fees (Phase 1 is free, per Section 4)
- Multi-city logistics beyond simple shop-by-city listing
- In-app chat between student and shop (use the order "comment" field only; future enhancement)
- Loyalty points / referral rewards system
- Native mobile apps (responsive web only for v1)
- Multiple payment gateways (Razorpay only for v1)
- Shop-side multi-branch management (one shop = one profile in v1)
- Automated refunds (manual Super Admin-initiated refunds only in v1)

---

## 10. Glossary (for consistent terminology across all docs)

| Term | Meaning |
|---|---|
| Student / Customer | End user placing a print order (used interchangeably; account type is "Customer" in DB to allow non-students too) |
| Shop / Shopkeeper / Vendor | Print shop partner account |
| Super Admin | Platform owner/operator account with full oversight |
| Order | A single print job submitted by a student to one shop |
| Order ID | Unique, human-shareable identifier per order (e.g., `PKB-20260619-0001`) |
| Spec | The print specification chosen by student (color mode, copies, paper size, binding) |
| Shop Status | Open / Closed / Holiday — controls order placement eligibility |
| Order Status | Placed → Accepted/Rejected → Printing → Ready for Collection → Collected (full lifecycle in DB doc) |
| GMV | Gross Merchandise Value — total value of orders processed through the platform |
