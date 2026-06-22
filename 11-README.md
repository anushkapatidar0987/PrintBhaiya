# PrintKarDoBhaiya

**Skip the queue. Print smart.**

PrintKarDoBhaiya is a web platform that lets students get their documents printed at a local print shop without physically going there, waiting in line, or explaining what they need in person. Upload your file, choose how you want it printed, pick a shop, pay online, and walk in only to collect it when it's ready.

---

## What This Is

If you're a student, you've probably stood in a print shop queue holding a flash drive, explaining "10 pages, black and white, double-sided" to someone too busy to listen properly, then waiting around for it to finish. PrintKarDoBhaiya removes that entire wait.

If you run a print shop, you've probably dealt with customers crowding your counter, unclear instructions, and no easy way to manage a queue of print jobs. PrintKarDoBhaiya gives you an organized order queue with everything specified clearly upfront, and payment already collected before you even start printing.

---

## How It Works

### If you're a Student:
1. **Sign up / log in** to your student account.
2. **Upload your file** (PDF, image, or document).
3. **Choose your specs** — color or black & white, number of copies — and leave a note for the shop if needed (e.g. "please staple").
4. **Pick a print shop** from the list — only shops currently open are selectable.
5. **Pay online** via Razorpay — the price is calculated automatically from that shop's listed rates. No extra platform fee.
6. **Get notified** by email and WhatsApp as your order moves through: placed → accepted → printing → ready for collection.
7. **Walk in and collect** your print — no waiting around, it's already done.
8. Track all your current and past orders, plus your payment history, anytime from your student dashboard.

### If you run a Print Shop:
1. **Sign up / log in** to your shop account and set up your profile — pricing per page (color/B&W), shop address, WhatsApp number.
2. **Keep your shop status updated** — Open, Closed, or on Holiday — so students only see and select you when you're actually available. (You'll get a reminder email if you forget to update it.)
3. **Get notified instantly** by email and WhatsApp whenever a new order comes in — no need to keep checking the website.
4. **Manage your orders** from your dashboard — accept or reject incoming orders, mark them as printing, and tick them off as ready once done.
5. **Track your full order history** and everything that's come through your shop on the platform.

### Behind the scenes: Super Admin
The platform owner has a super admin view that oversees every shop, every order, and every transaction across the whole platform — used to manage shop accounts, resolve issues, and keep an eye on overall platform health.

---

## Current Status

This platform does **not** charge any platform fee right now. Students pay print shops directly through Razorpay at the shop's own listed prices. The goal right now is to make ordering prints genuinely easier for everyone, and prove that out before introducing any monetization later.

---

## Tech Stack (For Developers)

- **Backend:** Django + Django REST Framework (Python)
- **Database:** PostgreSQL (hosted on Supabase/Neon)
- **Frontend:** React (Vite), hosted on Vercel
- **File Storage:** Cloudinary / AWS S3
- **Payments:** Razorpay
- **Notifications:** Email (Brevo) + WhatsApp (Meta Cloud API / Gupshup)
- **Backend Hosting:** Render

For full technical details, see the other docs in this project:
- `01-ARCHITECTURE.md` — system design, user roles, data model, core rules
- `02-API-CODING-GUIDE.md` — API endpoints, models, hosting/deployment steps
- `03-FRONTEND-SPEC.md` — frontend pages and user flows
- `04-SEO-AND-BUSINESS.md` — growth, SEO, and monetization roadmap
- `05-WORK-LOG.md` — running history of what's been built and decided, and what's next

---

## Why "PrintKarDoBhaiya"?

Because that's exactly what every student says to the shop guy at the counter — "bhaiya, ye print kar do" (brother, print this for me). The name keeps the product exactly as simple and familiar as the problem it solves.
