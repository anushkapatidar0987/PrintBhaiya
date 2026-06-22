# PrintKarDoBhaiya — Database Design & Data Management

> Part of the 6-file doc set. Read `00_MASTER_PRD.md` and `01_SYSTEM_DESIGN_ARCHITECTURE.md` first. This file defines the **data model**: entities, fields, relationships, lifecycle states, and data management practices (backups, retention, migrations). Written as a spec for Django model implementation — field names below are suggestions an AI coding agent can translate directly into `models.py`.

---

## 1. Entity-Relationship Overview (textual)

```
User (base, custom AbstractUser)
 ├──< Student (OneToOne or role-flag on User)
 ├──< ShopOwner (OneToOne or role-flag on User) ──< Shop (1 owner : 1 shop in v1, FK allows future 1:many)
 └──< SuperAdmin (role-flag on User, or is_staff/is_superuser)

Shop
 ├──< PriceList (1:1 or 1:Many if versioned)
 ├──< BindingOption (1:Many)
 ├──< ShopStatusLog (1:Many — history of open/closed/holiday changes)
 └──< Order (1:Many — orders placed to this shop)

Order
 ├── belongs to Student (FK)
 ├── belongs to Shop (FK)
 ├──< OrderFile (1:Many — student can upload multiple files per order)
 ├──< OrderStatusHistory (1:Many — audit trail of status transitions)
 ├── has one Payment (1:1)
 └── has price_breakdown (JSON snapshot, not FK to PriceList — see pricing engine note)

Payment
 ├── belongs to Order (1:1)
 └── stores Razorpay identifiers + status

NotificationLog
 ├── belongs to User (FK, recipient)
 └── related_object (generic FK or order_id reference) — log of what was sent, when, via which channel, success/failure
```

---

## 2. Core Models (field-level spec)

### 2.1 `User` (custom Django user model, extends `AbstractUser` or `AbstractBaseUser`)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | Use UUID, not auto-increment int, for public-facing IDs to avoid enumeration attacks (see security doc) |
| email | EmailField, unique | Primary login identifier |
| phone_number | CharField | Required — used for WhatsApp notifications; validate Indian phone format |
| role | CharField, choices: `STUDENT`, `SHOP_OWNER`, `SUPER_ADMIN` | Drives permission logic |
| is_email_verified | Boolean, default False | |
| is_active | Boolean, default True | Standard Django field; used to disable abusive accounts |
| date_joined | DateTime, auto_now_add | |
| last_login | DateTime | Standard Django field |

> **Design decision**: a single `User` table with a `role` field (rather than fully separate auth tables per role) is simpler for Django's built-in auth system and JWT claims. Role-specific data (e.g., shop details) lives in a related `Shop` model FK'd to `User`, not duplicated fields on `User` itself.

### 2.2 `Shop`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| owner | FK → User | `on_delete=PROTECT` (don't cascade-delete a shop if user row is removed — orders history must survive) |
| name | CharField | |
| slug | SlugField, unique | For SEO-friendly URLs (`/shops/<city>/<slug>`), per Master PRD SEO section |
| address | TextField | |
| city | CharField | Indexed — used for filtering/SEO landing pages |
| area | CharField | More granular than city (e.g., "near XYZ College Gate") |
| latitude / longitude | Decimal, nullable | Optional, for future map-based discovery |
| contact_phone | CharField | |
| status | CharField, choices: `OPEN`, `CLOSED`, `HOLIDAY` | Drives order-placement eligibility (Master PRD core rule) |
| status_updated_at | DateTime | Used by the "reminder if not updated" logic |
| is_approved | Boolean, default False | Super Admin gate before shop is publicly visible/orderable |
| is_active | Boolean, default True | Soft-disable by admin (different from owner-controlled open/closed) |
| created_at / updated_at | DateTime | |

### 2.3 `PriceList` (belongs to Shop)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| shop | OneToOne → Shop | v1: one active price list per shop. Consider `is_active` + `effective_from` fields instead of hard OneToOne if price history/versioning is wanted later — recommend including `effective_from`/`effective_to` from the start since it's cheap now and valuable later for the "snapshot price at order time" requirement to be auditable against shop's price history |
| bw_rate_per_page | DecimalField | Stored in INR with 2 decimal places, or integer paise — **pick one money convention and apply it everywhere** (recommend integer paise to avoid float issues, per architecture doc) |
| color_rate_per_page | DecimalField | |
| double_sided_supported | Boolean | |
| double_sided_rate_per_page | DecimalField, nullable | If pricing differs for double-sided |
| minimum_order_amount | DecimalField, nullable | Optional shop-level minimum |
| updated_at | DateTime | |

### 2.4 `BindingOption` (belongs to Shop, Many per Shop)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| shop | FK → Shop | |
| name | CharField | e.g., "Spiral Binding", "Stapling", "None" |
| price | DecimalField | Flat charge added to order if selected |
| is_active | Boolean | Shop can disable an option without deleting history of past orders that used it |

### 2.5 `ShopStatusLog` (audit trail, belongs to Shop)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| shop | FK → Shop | |
| status | CharField (same choices as Shop.status) | |
| changed_at | DateTime, auto_now_add | |
| changed_by | FK → User, nullable | Null if system-triggered (e.g., auto-marked stale) |

### 2.6 `Order`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | Internal PK |
| order_number | CharField, unique, indexed | **Human-facing unique Order ID**, e.g., `PKB-20260619-0001` — generate via a deterministic scheme (date + sequence), not just the UUID, since students/shops need to reference it verbally/in writing |
| student | FK → User | `on_delete=PROTECT` |
| shop | FK → Shop | `on_delete=PROTECT` |
| status | CharField, choices: see Section 3 (Order Lifecycle) | |
| color_mode | CharField, choices: `BW`, `COLOR` | |
| page_count | PositiveIntegerField | Auto-detected where possible, else student-entered |
| copies | PositiveIntegerField, default 1 | |
| double_sided | Boolean, default False | |
| binding_option | FK → BindingOption, nullable | |
| student_comment | TextField, blank | Free-text instructions from student |
| shop_rejection_reason | TextField, blank, nullable | Filled if status becomes `REJECTED` |
| price_breakdown | JSONField | Snapshot of how price was computed (rates used, counts, binding cost) — for transparency/audit, per architecture doc pricing engine note |
| total_amount | DecimalField (or integer paise) | Final price charged |
| platform_fee | DecimalField, default 0 | Exists from day one per Master PRD Section 4, defaults 0 in Phase 1 |
| created_at | DateTime, auto_now_add | |
| updated_at | DateTime, auto_now | |
| collected_at | DateTime, nullable | Set when status → `COLLECTED` |

### 2.7 `OrderFile` (belongs to Order, Many per Order)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| order | FK → Order | |
| file_url | URLField | Cloudinary/S3 secure URL or reference ID |
| original_filename | CharField | |
| file_type | CharField | e.g., `pdf`, `docx`, `jpg` |
| file_size_bytes | PositiveIntegerField | Enforce max size at upload (see architecture doc) |
| uploaded_at | DateTime, auto_now_add | |
| is_deleted | Boolean, default False | Soft-delete flag for retention-policy cleanup (Master PRD privacy section) — actual file removed from storage by a scheduled job, DB row can be kept for order history reference (filename only) or also purged per policy decision |

### 2.8 `OrderStatusHistory` (audit trail, belongs to Order)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| order | FK → Order | |
| from_status | CharField, nullable | |
| to_status | CharField | |
| changed_at | DateTime, auto_now_add | |
| changed_by | FK → User, nullable | |
| note | TextField, blank | e.g., rejection reason duplicated here for full audit trail |

> **Why a separate history table** rather than just relying on `Order.status` + `updated_at`: enables full audit trail for dispute resolution (Master PRD risk section), and lets the Super Admin portal show a timeline per order.

### 2.9 `Payment` (1:1 with Order)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| order | OneToOne → Order | |
| razorpay_order_id | CharField | Created at checkout initiation |
| razorpay_payment_id | CharField, nullable | Filled on successful payment via webhook |
| razorpay_signature | CharField, nullable | Stored for audit (the signature that was verified) |
| status | CharField, choices: `CREATED`, `PAID`, `FAILED`, `REFUND_INITIATED`, `REFUNDED` | |
| amount | DecimalField (or paise) | Should match `Order.total_amount` — reconciliation check |
| currency | CharField, default `INR` | |
| raw_webhook_payload | JSONField, nullable | Store full webhook payload received for audit/debugging — **do not log full payload to plaintext application logs**, store in DB field with appropriate access control instead (see security doc) |
| created_at / updated_at | DateTime | |

### 2.10 `NotificationLog`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| recipient | FK → User | |
| order | FK → Order, nullable | Most notifications relate to an order, but not all (e.g., shop approval) |
| channel | CharField, choices: `EMAIL`, `WHATSAPP`, `IN_APP` | |
| event_type | CharField | e.g., `ORDER_PLACED`, `ORDER_READY`, `STATUS_REMINDER` |
| status | CharField, choices: `SENT`, `FAILED`, `PENDING` | |
| provider_response | JSONField, nullable | For debugging delivery failures |
| sent_at | DateTime, nullable | |
| created_at | DateTime, auto_now_add | |

### 2.11 `InAppNotification` (for the website notification feed itself, distinct from the delivery log above)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user | FK → User | |
| order | FK → Order, nullable | |
| message | CharField | |
| is_read | Boolean, default False | |
| created_at | DateTime, auto_now_add | |

---

## 3. Order Lifecycle (Status State Machine)

```
PENDING_PAYMENT → PAYMENT_FAILED (terminal, student can retry → new PENDING_PAYMENT or abandon)
PENDING_PAYMENT → PLACED  (on verified successful payment via webhook)
PLACED → ACCEPTED  (shop action)
PLACED → REJECTED  (shop action; terminal — refund flow initiated, see payments)
ACCEPTED → PRINTING  (shop action)
PRINTING → READY_FOR_COLLECTION  (shop action — "tick the checkbox")
READY_FOR_COLLECTION → COLLECTED  (shop action, confirms handover; terminal)
```

**Rules an AI agent implementing this must enforce server-side** (not just trust frontend):
- Status transitions must follow the above graph only — reject any API call attempting an invalid jump (e.g., `PLACED → READY_FOR_COLLECTION` directly should be rejected with a 400 error).
- Only the **owning shop** can transition `PLACED → ACCEPTED/REJECTED` and onward; only Super Admin can override in exceptional cases (with the override itself logged in `OrderStatusHistory` with `changed_by`).
- `REJECTED` and `PAYMENT_FAILED` are terminal states with no further forward transitions.
- Every transition writes a row to `OrderStatusHistory` and triggers the notification matrix from the architecture doc.

---

## 4. Indexing & Query Performance Notes

- Index `Order.order_number` (unique lookup by students/shops referencing their order).
- Index `Order.status` + `Order.shop` composite (shop dashboard queries: "show me all PLACED/ACCEPTED orders for my shop").
- Index `Order.student` (student's order history page).
- Index `Shop.city`, `Shop.status`, `Shop.is_approved` composite (public shop listing filter — "open shops in city X").
- Index `Shop.slug` (SEO URL lookups).
- `NotificationLog` indexed on `recipient` + `created_at` for the in-app feed query.

---

## 5. Data Management Practices

### 5.1 Backups
- Both Supabase and Neon offer automated daily backups even on free/low tiers (verify current plan specifics at setup time — confirm via their docs since free-tier backup retention varies and may change). At minimum, **export a manual DB dump weekly** during early stage as a redundant safety net regardless of platform-provided backups.
- Before any schema migration that alters/drops columns, take a manual backup snapshot first.

### 5.2 Migrations
- Use Django's built-in migration system (`makemigrations` / `migrate`) — never hand-edit production DB schema directly.
- Migrations must be tested against a staging/local copy of production-like data before applying to production, especially for any migration that touches `Order`, `Payment`, or `Shop` (financial/operational core).
- Avoid destructive migrations (dropping columns with data) without a deprecation step (mark nullable/unused first, remove in a later release after confirming no code path depends on it).

### 5.3 Data Retention & Privacy (ties to Master PRD Section 8)
- **Uploaded print files**: define a retention window (e.g., auto-delete from Cloudinary/S3 30 days after `Order.status = COLLECTED`, via a scheduled job). This reduces storage cost and privacy exposure (uploaded assignments/documents may contain personal data).
- **Order records** (metadata, not files) should be retained longer for accounting/dispute history — these are not personally sensitive in the same way as file *contents*.
- Document this policy in the public Privacy Policy page (Master PRD legal note).

### 5.4 Soft Delete vs Hard Delete
- User accounts: prefer soft-delete (`is_active=False`) over hard delete, to preserve referential integrity of historical orders/payments tied to that user.
- Shop accounts: same — soft-disable (`is_active=False`), never hard-delete a shop with order history.
- Files: soft-delete flag (`OrderFile.is_deleted`) before actual storage-provider deletion, so the deletion job has a clear queue to work from and a record that deletion happened.

### 5.5 Money Field Convention
- **Decide once, apply everywhere**: recommend storing all monetary values as **integer paise** (smallest currency unit) rather than `DecimalField` with rupees, to avoid floating-point/rounding inconsistencies across the codebase, Razorpay API (which itself uses paise), and reporting. If `DecimalField` is preferred for readability in Django Admin, ensure conversion to/from paise happens at a single well-defined boundary (e.g., serializer layer), not scattered across the codebase.

---

## 6. Future-Proofing Notes (data model decisions made now to avoid painful migrations later)

These are **not v1 features** (per Master PRD Section 9 Out-of-Scope) but the schema choices above were made with these in mind, so flag them to anyone extending the schema:
- `Shop.owner` FK direction allows multi-branch (one owner, many shops) later without restructuring, even though v1 UI/logic enforces one shop per owner.
- `PriceList` with `effective_from`/`effective_to` fields allows price history/versioning later.
- `Order.platform_fee` field exists now, defaults to 0, ready for Phase 2 monetization.
- `latitude`/`longitude` on `Shop` ready for future map-based discovery without a later migration.
- Referral tracking is **not** in the schema yet — if added later, plan a `ReferralCode` model + `referred_by` FK on `User`; not pre-built now since Master PRD explicitly defers it and speculative fields add clutter.

---

## 7. Cross-References

- Pricing engine logic that produces `Order.price_breakdown`: `01_SYSTEM_DESIGN_ARCHITECTURE.md` Section 5
- Payment webhook handling and signature verification for `Payment` model fields: `03_CYBERSECURITY_PAYMENT_SAFETY.md`
- File upload validation rules feeding `OrderFile`: `03_CYBERSECURITY_PAYMENT_SAFETY.md`
