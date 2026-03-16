# CleanFlow — Smart Laundry & Dry Cleaning Platform

A functional prototype demonstrating digital business transformation of a traditional laundry/dry cleaning business.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Prisma 7**, **PostgreSQL (Supabase)**, **Tailwind CSS**, and **shadcn/ui**.

---

## Getting Started (Teammates)

> The database is already set up on Supabase — you do not need to install PostgreSQL or run any migrations. Just clone, configure, and run.

### Step 1 — Prerequisites

Install these once if you don't have them:

- [Node.js 20+](https://nodejs.org) — check with `node -v`
- Git — check with `git --version`

### Step 2 — Clone the repo

```bash
git clone <github-repo-url>
cd cleanflow
```

### Step 3 — Install dependencies

```bash
npm install
```

### Step 4 — Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the actual values (get these from Allison via WhatsApp/Telegram — do **not** commit this file):

```
DATABASE_URL=...       # Supabase connection string (pooled)
DIRECT_URL=...         # Supabase direct connection
AUTH_SECRET=...        # Shared auth secret
AUTH_URL=http://localhost:3000
ANALYTICS_API_KEY=...  # Any string, e.g. "dev-key"
```

### Step 5 — Generate the Prisma client

```bash
npm run db:generate
```

### Step 6 — Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@demo.com | password123 |
| Customer 2 | customer2@demo.com | password123 |
| Admin | admin@demo.com | password123 |
| Driver | driver@demo.com | password123 |

---

## Editing the Code

### Where things live

```
cleanflow/
├── src/
│   ├── app/                       # All pages (Next.js App Router)
│   │   ├── page.tsx               # Landing page
│   │   ├── (auth)/                # Login + Register pages
│   │   ├── (customer)/            # Everything the customer sees
│   │   │   ├── dashboard/         # Order list
│   │   │   ├── orders/new/        # New order wizard
│   │   │   └── orders/[id]/       # Order detail + tracking
│   │   ├── (admin)/               # Everything the admin sees
│   │   │   └── admin/
│   │   │       ├── dashboard/     # Stats + pending pickups
│   │   │       ├── orders/        # All orders + order detail
│   │   │       └── schedule/      # Pickup approvals
│   │   └── api/
│   │       ├── analytics/         # REST endpoint for Python teammate
│   │       └── dispatch/          # Live data endpoint for digital twin
│   │
│   ├── actions/                   # Server actions — all database writes go here
│   │   ├── auth.ts                # Login, register, logout
│   │   ├── orders.ts              # Create order, upload photo, confirm, schedule pickup
│   │   └── admin.ts               # Update status, approve pickup, assign driver
│   │
│   ├── components/
│   │   ├── ui/                    # Base UI components (shadcn) — don't edit these
│   │   ├── customer/              # Customer-specific components
│   │   │   ├── CustomerNav.tsx    # Top nav bar
│   │   │   ├── NewOrderWizard.tsx # 4-step order creation flow
│   │   │   └── PickupScheduleCard.tsx
│   │   ├── admin/                 # Admin-specific components
│   │   │   ├── AdminNav.tsx       # Sidebar
│   │   │   └── AdminOrderActions.tsx
│   │   └── shared/
│   │       ├── OrderStatusBadge.tsx
│   │       └── OrderTimeline.tsx
│   │
│   ├── lib/
│   │   ├── ai/                    # AI analysis — edit analyzeLaundryImage.ts to plug in real model
│   │   ├── pricing/               # Price calculation logic
│   │   ├── auth/                  # Auth config + session helpers
│   │   └── db.ts                  # Prisma client singleton
│   │
│   └── types/
│       ├── index.ts               # Shared TypeScript types
│       └── constants.ts           # Labels, enums, pricing values
│
├── prisma/
│   ├── schema.prisma              # Database schema (models + relations)
│   └── seed.ts                    # Demo data seeder
│
├── python-analytics/              # Python teammate's folder
│   ├── README.md
│   └── fetch_orders.py
│
└── digital-twin/                  # Digital twin teammate's folder
    └── README.md
```

### Common tasks

**Changing a page's UI**
- Customer pages: `src/app/(customer)/`
- Admin pages: `src/app/(admin)/admin/`
- Each folder has a `page.tsx` — edit that file

**Adding a new page**
1. Create a folder under the right route group, e.g. `src/app/(customer)/profile/`
2. Add a `page.tsx` inside it
3. Link to it from `CustomerNav.tsx`

**Changing how data is fetched or saved**
- All database reads happen in page files (server components) or in `src/actions/`
- All database writes are in `src/actions/` as Server Actions
- Do not write database queries directly in components

**Changing the database schema**
1. Edit `prisma/schema.prisma`
2. Run `npm run db:push` to apply changes to Supabase
3. Run `npm run db:generate` to update the TypeScript types
4. Tell teammates to re-run `npm run db:generate`

**Plugging in real AI analysis**
- Edit `src/lib/ai/analyzeLaundryImage.ts`
- Set `ENABLE_REAL_AI=true` in `.env`
- See comments in that file for the expected response shape

### Workflow

```bash
# Before starting work — get the latest changes
git pull

# Create a branch for your feature
git checkout -b your-name/feature-name

# Make changes, then commit
git add .
git commit -m "describe what you did"

# Push and open a pull request
git push origin your-name/feature-name
```

---

## Available Scripts

```bash
npm run dev            # Start dev server at localhost:3000
npm run build          # Build for production
npm run lint           # Check for code errors

npm run db:generate    # Regenerate Prisma client (run after schema changes)
npm run db:push        # Apply schema changes to the database
npm run db:seed        # Re-insert demo data
npm run db:studio      # Open visual database browser in browser
```

---

## What Is Implemented vs Mocked

### Working Features
- User registration and login (NextAuth v5, credentials provider)
- Role-based route protection (CUSTOMER vs ADMIN via middleware)
- 4-step new order wizard: service type → photo upload → AI item review → pickup scheduling
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

| Feature | File | What to do |
|---------|------|------------|
| AI image analysis | `src/lib/ai/analyzeLaundryImage.ts` | Replace `callRealAIModel()` with OpenAI Vision / Claude / Python service |
| Image upload | `src/components/customer/NewOrderWizard.tsx` | Add UploadThing or Cloudinary |
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

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Auth.js v5 (NextAuth) | Free, native App Router support, no vendor lock-in |
| Server Actions for mutations | No separate API layer needed for app features |
| Shared Supabase DB | Everyone on the team works against the same data |
| Mock AI first | Unblocks UI development; drop-in swap when real API is ready |
| Prisma 7 config file | `prisma.config.ts` holds connection URL (Prisma 7 requirement) |
| Route groups `(customer)` / `(admin)` | Clean separation; different layouts per role |
| Domain services in `src/lib/` | Business logic stays out of UI components and actions |
