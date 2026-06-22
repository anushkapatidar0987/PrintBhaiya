# PrintKarDoBhaiya — Frontend Specification & Planning

> Read `01-ARCHITECTURE.md` and `02-API-CODING-GUIDE.md` first. This file covers the React (Vite) frontend: pages, components, states, and user flows for all three roles.

---

## 1. Tech Notes

- React + Vite, deployed on Vercel.
- Use **React Router** for page routing.
- Use a simple, consistent component library approach — either plain CSS/Tailwind or a lightweight library (MUI/Chakra). Document your final choice here once decided so future contributors/agents stay consistent.
- State management: for an app this size, React Context + hooks is enough. Don't reach for Redux unless complexity genuinely grows.
- All API calls go through a single `api.js`/`apiClient.js` wrapper (e.g. using `axios` with an interceptor that attaches the JWT token and handles 401 refresh) — never scatter raw `fetch` calls across components.

---

## 2. Public Pages (No Login Required)

### Landing Page (`/`)
- Hero section explaining the product in one line: "Upload your file, pick a print shop, get it printed — no queue, no hassle."
- How it works (3-4 step visual: Upload → Choose Shop → Pay → Collect).
- CTA buttons: "I'm a Student" → signup/login, "I Own a Print Shop" → shopkeeper signup/login.
- List/map of partner shops (optional, builds trust — can show shop name + area, not full detail, to non-logged-in visitors).

### Login Page (`/login`)
- Single login form, role is determined by the account itself (not a toggle) — backend returns role in the JWT/response, frontend redirects accordingly:
  - `student` → `/student/dashboard`
  - `shopkeeper` → `/shop/dashboard`
  - `admin` → `/admin/dashboard`

### Signup Pages
- `/signup/student` — name, email, phone, password.
- `/signup/shopkeeper` — shop name, owner name, email, phone, WhatsApp number, address, password. (Decide: does shopkeeper signup require manual admin approval before the shop goes live/visible to students? Recommended for V1 to avoid fake/spam shops — document the decision once made.)

---

## 3. Student Portal

### Student Dashboard (`/student/dashboard`)
- Quick summary: active orders (in progress), recent order status.
- Prominent "New Print Order" button.

### New Order Flow (`/student/new-order`) — multi-step
**Step 1: Upload File**
- Drag-and-drop or click to upload.
- Show filename, size, page count (if auto-detected) once uploaded.
- Validation feedback (file too large, wrong type) shown immediately.

**Step 2: Select Specification**
- Color or Black & White toggle.
- Number of copies (stepper input).
- If page count not auto-detected, manual input field.
- Optional comment box: "Any instructions for the shop? (e.g. staple, double-sided)"

**Step 3: Select Shop**
- List/grid of shops, each showing: name, address/area, distance (if geolocation available — optional for V1), per-page price for the student's selected spec, and **status badge** (`Open` in green / `Closed` or `On Holiday` in gray).
- **Closed shops are shown but not selectable** — grayed out, with a small note like "Currently closed — try another shop." (Per architecture doc Section 6 — this is a UI nicety; backend enforces this regardless.)
- Live price preview updates as the student picks different shops (calls `/orders/calculate-price/`).

**Step 4: Review & Pay**
- Summary of file, spec, shop, comment, and final price.
- "Proceed to Pay" button → calls `POST /orders/`, then opens Razorpay Checkout.
- On payment success → redirect to Order Confirmation page showing the unique Order ID.
- On payment failure/cancel → show a friendly retry option, order stays in `pending_payment` (or gets cleaned up — decide and document).

### Order Tracking (`/student/orders`)
- List of all past and current orders, each showing Order ID, shop name, status badge, date, amount.
- Click into an order (`/student/orders/<order_id>`) for full detail: status timeline (visual stepper: Placed → Accepted → Printing → Ready → Collected), file preview/download link, comment shown, payment receipt info.

### Payment History (`/student/payments`)
- Simple table: date, order ID, amount, payment status. Can be merged into the order detail view instead of a separate page if simpler — decide based on actual usage once built.

### Student Profile (`/student/profile`)
- Edit name, phone, email, password.

---

## 4. Shopkeeper Portal

### Shop Dashboard (`/shop/dashboard`)
- **Shop status toggle** front and center: Open / Closed / Holiday — this should be the most prominent, easiest-to-find control on the whole portal, since architecture depends on shopkeepers keeping it current.
- Summary: new orders awaiting action, orders currently printing, orders ready for collection.
- Notification settings reminder visible if WhatsApp/email not yet configured.

### Incoming Orders (`/shop/orders`)
- Tabbed or filterable view by status: `New (Placed)`, `Accepted/Printing`, `Ready for Collection`, `Collected/History`.
- Each order card: Order ID, student name (or anonymized ID if you want privacy until accepted — decide), spec (color/B&W, copies, pages), comment from student, file (downloadable/previewable), price.
- Action buttons per status:
  - On `Placed`: **Accept** / **Reject** buttons.
  - On `Accepted`: **Mark as Printing** button.
  - On `Printing`: **Mark as Ready (checkbox/button)** — this is the key action mentioned in your requirements; make it a clear, satisfying single click, since shopkeepers will do this dozens of times a day.
  - On `Ready`: **Mark as Collected** button (optional close-out step).

### Shop Profile & Pricing (`/shop/profile`)
- Edit shop name, address, WhatsApp number.
- **Pricing editor**: price per page B&W, price per page color. Changes here only affect *future* orders, never retroactively change pending order prices.

### Shop Order History (`/shop/history`)
- All past collected orders, filterable by date — useful for the shopkeeper's own bookkeeping, and indirectly builds trust since they can see total volume done through the platform.

---

## 5. Super Admin Portal

> For V1, much of this can be the customized **Django Admin** (server-rendered, no React needed) per `02-API-CODING-GUIDE.md` Section 3. Build the React version below only once you want nicer UX/charts — note current status in `05-WORK-LOG.md`.

### Admin Dashboard (`/admin/dashboard`)
- Platform-wide stats: total orders today/week/month, total transaction volume, active shops count, new signups.

### Shop Management (`/admin/shops`)
- List all shops, with status, approve/reject new shopkeeper signups (if approval flow is enabled), deactivate/reactivate shop accounts.

### Order Management (`/admin/orders`)
- All orders platform-wide, filterable by shop/status/date — for dispute resolution ("student says they paid but shop says no order arrived").

### Transactions (`/admin/transactions`)
- All payments, filterable, with refund status visibility.

---

## 6. Shared Components

| Component | Used in | Notes |
|---|---|---|
| `StatusBadge` | Order lists, shop lists | Color-coded: green=open/ready, yellow=pending/printing, red=closed/rejected, gray=collected |
| `OrderStatusStepper` | Order detail page | Visual horizontal/vertical stepper showing the state machine progress |
| `FileUploadDropzone` | New order flow | Drag-drop + click, shows validation errors inline |
| `ShopCard` | Shop selection step | Reusable for landing page preview and student order flow |
| `PriceSummary` | Review & pay step | Shows breakdown: per-page rate × pages × copies = total |
| `Navbar` | All authenticated pages | Role-aware — shows different links per role |
| `NotificationBell` (optional, future) | Authenticated pages | In-app notification center, separate from email/WhatsApp pushes |

---

## 7. Key UX Principles for This App

1. **Shopkeepers are busy and not always tech-savvy.** Their portal should require the fewest possible clicks/taps to do the most common action ("mark as ready"). Big buttons, clear labels, minimal scrolling. Assume they may be using a basic Android phone in a shop, not a desktop.
2. **Students want certainty.** At every step, show clearly: what will this cost, which shop, what's the current status, when will it be ready. Avoid ambiguity.
3. **Trust signals matter for a new platform.** Showing shop open/closed status accurately, accurate pricing, and reliable notifications are what make a student trust the app over just walking to a shop. Don't compromise on these for speed of building other features.
4. **Mobile-first.** Both students and shopkeepers will likely use this primarily on phones. Design and test mobile layouts first, desktop second.

---

## 8. Open Decisions to Document Once Made

These are flagged throughout this doc — track final decisions here so they're not lost:

- [ ] Does shopkeeper signup require manual admin approval before going live?
- [ ] Is student identity hidden from shopkeeper until order is accepted, or always visible?
- [ ] What happens to an order stuck in `pending_payment` (abandoned checkout) — auto-cleanup after X hours?
- [ ] Final UI library choice (Tailwind / MUI / Chakra / plain CSS)
- [ ] Is page count auto-detected from PDF or manually entered by student?
- [ ] Auto-mark `collected` after N days of being `ready_for_collection`, or always manual?
