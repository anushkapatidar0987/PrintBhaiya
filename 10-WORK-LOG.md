# PrintKarDoBhaiya — Work Log & Decision History

> **This file is the project's memory.** Read it before starting any new work session. Update it after finishing any meaningful work — new feature, bug fix, architecture decision, or even a decision to *not* do something a certain way. If this file isn't updated, the next session (you or an AI agent) will waste time rediscovering context or, worse, redo/undo work or contradict earlier decisions.

> **Format for every entry:** Date, what was done, why, what's left/known issues. Keep entries in reverse-chronological order (newest at top). Don't delete old entries — strike through if something was later reversed, and explain why.

---

## How to Use This File (Instructions for AI Agents)

1. **Before starting work:** Read the most recent 3-5 entries to understand current state. Check the "Current Phase & Status" section below first for a quick snapshot.
2. **After finishing work:** Add a new entry at the top of the Log section, following the format. Be specific — "fixed bug" is useless, "fixed race condition in payment verification where double webhook calls could create duplicate Payment records" is useful.
3. **If you make an architecture decision** not already covered in `01-ARCHITECTURE.md`, add it here AND update that file if it's structural (new model field, new status, new role behavior).
4. **If you discover a bug or incomplete feature you're not fixing right now**, log it in "Known Issues / TODO" so it isn't forgotten.
5. **Never silently change the order status state machine, role permissions, or pricing logic** without logging why here — these are the most fragile parts of the system per `01-ARCHITECTURE.md` Section 8.

---

## Current Phase & Status (Keep This Section Updated — Overwrite, Don't Append)

**Phase:** Planning / Pre-development
**Last updated:** 2026-06-19

**What exists right now:**
- Planning documents only (this set of `.md` files). No code has been written yet.

**What's decided:**
- Tech stack: Django + DRF backend, PostgreSQL (Supabase/Neon), React+Vite frontend (Vercel), Cloudinary/S3 for files, Razorpay for payments, Brevo for email, Meta Cloud API/Gupshup for WhatsApp.
- Core data model and order state machine as defined in `01-ARCHITECTURE.md`.
- No platform fee in Phase 1.

**What's NOT decided yet (see also `03-FRONTEND-SPEC.md` Section 8):**
- Whether shopkeeper signup requires manual admin approval before going live.
- Whether student identity is hidden from shopkeeper until order accepted.
- Auto-cleanup policy for abandoned `pending_payment` orders.
- Final frontend UI library (Tailwind/MUI/Chakra/plain CSS).
- Whether page count is auto-detected from PDF or manually entered.
- Auto-mark-collected policy (manual only, or auto after N days).

**Immediate next steps (as of last update):**
1. Set up Django project skeleton with the apps described in `02-API-CODING-GUIDE.md` Section 1.
2. Set up Supabase/Neon Postgres + connect Django to it.
3. Build `accounts` app (custom User model with role field) — do this first since everything else depends on it.
4. Build `shops` app + basic shop CRUD before touching orders/payments.

---

## Known Issues / TODO (Running List)

> Add items here when discovered. Remove/strike-through when resolved, with a note on which log entry resolved it.

- [ ] None yet — project hasn't started coding.

---

## Decisions Log (Architecture/Business Decisions, Separate From Day-to-Day Work)

> Use this for "why did we do it this way" decisions specifically, so they don't get buried in daily work entries.

### 2026-06-19 — Chose PostgreSQL over MongoDB despite initial request
**Decision:** Use PostgreSQL instead of MongoDB, even though MongoDB was the original preference stated.
**Why:** Django's ORM, admin panel, and migration system are built for relational databases. The app's core data (Order → Student, Order → Shop, Order → Payment, Order → StatusHistory) is inherently relational with foreign-key integrity requirements (especially around payments, where data correctness really matters). Using MongoDB would mean either abandoning Django's ORM (via poorly-maintained packages like `djongo`) or fighting the framework throughout. PostgreSQL via Supabase/Neon has a generous free tier, so there's no budget downside.
**Reversal risk:** Low — this is a foundational choice. Reversing later would require a full data migration. Flag loudly in any future session if someone proposes switching.

### 2026-06-19 — No platform fee in Phase 1
**Decision:** `calculated_price` = shop's listed price exactly, no markup, no fee.
**Why:** Stated business goal is to build trust and usage first, monetize later. Keeping pricing logic simple now avoids premature complexity (refund math, payout splitting) that would need to be reworked anyway once a real monetization model is chosen with real data.
**Reversal risk:** Expected to change in Phase 2 — see `04-SEO-AND-BUSINESS.md` Section 4. When it does change, update `calculate_order_price()` logic described in `02-API-CODING-GUIDE.md` Section 4, and log that change here.

### 2026-06-19 — Notifications sent synchronously in V1, not via Celery/Redis
**Decision:** Email/WhatsApp sending happens inline within Django signal handlers for V1, not via a task queue.
**Why:** Celery+Redis adds hosting cost and setup complexity not justified at zero/low traffic. The added request latency (~1s for an external API call) is an acceptable tradeoff for now.
**Reversal risk:** Expected to change once traffic grows and request latency/reliability becomes a real problem — see `02-API-CODING-GUIDE.md` Section 6, Option B. Revisit this decision once order volume is high enough that synchronous sending visibly slows down the app or notification failures become frequent (no automatic retry exists with the sync approach — note this as a related limitation).

---

## Work Log (Reverse Chronological — Newest First)

### 2026-06-19 — Initial planning documents created
**Done by:** Claude (AI agent) + project owner, in planning session.
**What was done:** Created the full set of planning markdown docs:
- `01-ARCHITECTURE.md` — system overview, roles, data model, state machine, non-negotiable rules
- `02-API-CODING-GUIDE.md` — Django app structure, models, API endpoints, Razorpay flow, hosting steps
- `03-FRONTEND-SPEC.md` — React page/component plan for all three portals
- `04-SEO-AND-BUSINESS.md` — SEO strategy, growth tactics, monetization roadmap
- `05-WORK-LOG.md` — this file
- `06-README.md` — plain-language project explainer

**Why:** Project owner wanted full planning documentation before writing any code, specifically so future work (by themselves or AI coding agents) has consistent context and doesn't contradict earlier decisions.

**What's left:** Everything — no code written yet. See "Immediate next steps" above.

**Notes for next session:** Start with Django project skeleton + `accounts` app. Don't start building frontend pages until at least the auth + shops API exists, since the frontend spec assumes those APIs are callable.

---

<!-- 
TEMPLATE FOR NEW ENTRIES — copy this block for each new work session:

### YYYY-MM-DD — [Short title of what was done]
**Done by:** [Claude / your name / agent name]
**What was done:** [Specific description — files/apps/features touched]
**Why:** [Reasoning, especially if it deviates from or extends the docs]
**What's left / known issues:** [Anything incomplete, anything to watch out for]
**Notes for next session:** [Anything the next person/agent should know before continuing]

-->
