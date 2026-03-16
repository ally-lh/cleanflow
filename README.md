# CleanFlow — Smart Laundry & Dry Cleaning Platform

A functional prototype demonstrating digital business transformation of a traditional laundry/dry cleaning business.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Prisma 7**, **PostgreSQL**, **Tailwind CSS**, and **shadcn/ui**.

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- PostgreSQL (local or Supabase free tier)

### 2. Install dependencies

```bash
cd cleanflow
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set:
- `DATABASE_URL` — your PostgreSQL connection string
- `AUTH_SECRET` — generate with `openssl rand -base64 32`

### 4. Set up the database

```bash
npm run db:push        # Push schema to DB
npm run db:generate    # Generate Prisma client
npm run db:seed        # Insert demo data
```

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000

### Demo accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@demo.com | password123 |
| Customer 2 | customer2@demo.com | password123 |
| Admin | admin@demo.com | password123 |
| Driver | driver@demo.com | password123 |

---

## Folder Structure

```
cleanflow/
├── prisma/
│   ├── schema.prisma          # All models, enums, relations
│   └── seed.ts                # Demo data seeder
├── prisma.config.ts           # Prisma 7 datasource config (connection URL here)
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login, Register pages
│   │   ├── (customer)/        # Customer-facing app
│   │   │   ├── dashboard/     # Order list
│   │   │   ├── orders/new/    # New order wizard (4-step)
│   │   │   └── orders/[id]/   # Order detail + tracking
│   │   ├── (admin)/           # Admin app
│   │   │   └── admin/
│   │   │       ├── dashboard/ # Operations overview + stats
│   │   │       ├── orders/    # All orders list + detail
│   │   │       └── schedule/  # Pickup approvals
│   │   ├── api/
│   │   │   ├── auth/          # NextAuth route handler
│   │   │   ├── analytics/     # Analytics API (for Python teammate)
│   │   │   └── dispatch/      # Live dispatch API (for digital twin)
│   │   └── page.tsx           # Landing page
│   ├── actions/               # Server actions (all DB mutations)
│   │   ├── auth.ts
│   │   ├── orders.ts
│   │   └── admin.ts
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── customer/          # Customer-specific components
│   │   ├── admin/             # Admin-specific components
│   │   └── shared/            # OrderStatusBadge, OrderTimeline
│   ├── lib/
│   │   ├── ai/                # AI analysis service (mock → real)
│   │   ├── auth/              # NextAuth config + session helpers
│   │   ├── pricing/           # Price calculation engine
│   │   ├── scheduling/        # Slot availability logic
│   │   ├── geo/               # Geocoding (mock → OneMap/Google)
│   │   ├── routing/           # Route estimation placeholder
│   │   ├── maps/              # Three.js map type stubs
│   │   ├── telemetry/         # Event logging
│   │   ├── orders/            # Order number generator
│   │   └── db.ts              # Prisma singleton
│   ├── types/
│   │   ├── index.ts           # All shared TypeScript types
│   │   ├── constants.ts       # Labels, enums, pricing constants
│   │   └── next-auth.d.ts     # Auth type augmentation
│   └── middleware.ts          # Route protection
├── python-analytics/          # Python data analysis (teammate handoff)
│   ├── README.md
│   └── fetch_orders.py
├── digital-twin/              # Logistics simulation (teammate handoff)
│   └── README.md
└── .env.example
```

---

## What Is Implemented vs Mocked

### Working Features
- User registration and login (NextAuth v5, credentials provider)
- Role-based route protection (CUSTOMER vs ADMIN via middleware)
- 4-step new order wizard: service type → photo upload → review AI items → pickup scheduling
- Mock AI image analysis (returns realistic clothing detection with confidence scores)
- Editable item list — quantity controls, add/remove items, category selection
- Pricing engine — per-item costs by service type, delivery fee logic (free over SGD 50)
- Pickup scheduling — date selection, time slot picker, address selection
- Order status tracking — visual 7-step progress timeline
- Admin dashboard — stats, pending pickup queue, recent orders
- Admin order detail — status update, invoice confirmation, pickup approve/reject, driver assignment
- Order status history log for analytics
- Analytics REST API (`/api/analytics/orders`) for Python consumption
- Dispatch live API (`/api/dispatch/live`) for digital twin / 3D map

### Mocked / Placeholder

| Feature | Location | To Replace |
|---------|----------|------------|
| AI image analysis | `src/lib/ai/analyzeLaundryImage.ts` | Replace `callMockModel()` with OpenAI Vision / Claude API |
| Image upload | `NewOrderWizard.tsx` | Add UploadThing or Cloudinary |
| Geocoding | `src/lib/geo/geocoding.ts` | OneMap API or Google Maps |
| Route estimation | `src/lib/routing/routeEstimator.ts` | Google Directions / OSRM |
| Notifications | `src/lib/telemetry/orderEvents.ts` | Add Resend (email) or Twilio (SMS) |
| Three.js map | `src/lib/maps/placeholder.ts` | See `digital-twin/README.md` |
| Payment | Not built | Add Stripe in invoice flow |

---

## For the Analytics Teammate

See `python-analytics/README.md`.

Fetch order data from:
```
GET /api/analytics/orders
Authorization: Bearer <ANALYTICS_API_KEY>
```

Includes: lat/lng, postal codes, service types, order timestamps, item categories, revenue, pickup/delivery distances.

---

## For the Digital Twin Teammate

See `digital-twin/README.md`.

Live dispatch data at:
```
GET /api/dispatch/live
```

Type definitions in `src/lib/maps/placeholder.ts`.

---

## Database Commands

```bash
npm run db:push        # Apply schema (no migration file — good for prototyping)
npm run db:migrate     # Apply with migration history
npm run db:seed        # Insert demo data
npm run db:studio      # Visual database browser
npm run db:generate    # Regenerate client after schema changes
```

---

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Auth.js v5 (NextAuth) | Free, native App Router support, no vendor lock-in |
| Server Actions for mutations | No separate API layer needed for app features |
| Mock AI first | Unblocks UI development; drop-in swap when real API is ready |
| Prisma 7 config file | `prisma.config.ts` holds connection URL (Prisma 7 requirement) |
| Route groups `(customer)` / `(admin)` | Clean separation; different layouts per role |
| Domain services in `src/lib/` | Business logic stays out of UI components and actions |
