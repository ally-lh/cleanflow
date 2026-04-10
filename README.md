# CleanFlow (QT Laundry)

QT Laundry is a smart laundry and dry-cleaning prototype for a digital business transformation project. The system lets customers create laundry orders, upload clothing photos for AI-assisted item estimates, schedule pickups, view order tracking, and explore rental-style recommendations. Admin users can manage orders, approve pickups, assign drivers, and view analytics.

## Hosted Site

Hosted site: **[https://cleanflow-seven.vercel.app](https://cleanflow-seven.vercel.app)**

Local development site: [http://localhost:3000](http://localhost:3000)

## What to Review

For grading/demo purposes, the main project is the `cleanflow` Next.js app. The supporting AI, analytics, and simulation work is split across these areas:

| Feature | Folder / File | What it does |
| --- | --- | --- |
| Analytics | `python-analytics/` | Python analytics scripts for order data, business insights, route analysis, and admin analytics snapshots. |
| AI stylist | `ai_stylist_recommender/` and `src/lib/ai-for-rental/server_marqo.py` | Local AI services for fashion styling and rental item recommendations. |
| AI price estimator | `src/lib/ai/analyzeLaundryImage.ts` | Image-based laundry item detection used during order creation to estimate item counts and pricing. |
| Digital twin | `digital-twin/` | Separate logistics dashboard that simulates CleanFlow fleet operations, deliveries, collections, congestion, and route insights. |

## Project Structure

```text
cleanflow/
├── ai_stylist_recommender/
│   ├── main.py
│   └── requirements.txt
│
├── python-analytics/
│   ├── README.md
│   ├── build_snapshot.py
│   ├── business_insights.py
│   ├── expansion_model.py
│   ├── fetch_orders.py
│   ├── geo_analysis.py
│   └── requirements.txt
│
├── digital-twin/
│   ├── README.md
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── App.tsx
│       ├── components/
│       ├── hooks/
│       └── lib/
│
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login and registration pages
│   │   ├── (customer)/          # Customer dashboard, new orders, and tracking
│   │   ├── (admin)/             # Admin dashboard, order management, and analytics
│   │   └── api/                 # API routes used by the app and AI services
│   │
│   ├── actions/                 # Server actions for auth, orders, and admin updates
│   ├── components/              # Shared, customer, and admin UI components
│   ├── lib/
│   │   ├── ai/
│   │   │   └── analyzeLaundryImage.ts
│   │   ├── ai-for-rental/
│   │   │   ├── server_marqo.py
│   │   │   ├── requirements.txt
│   │   │   └── rental_catalog_data.json
│   │   ├── pricing/
│   │   ├── auth/
│   │   └── db.ts
│   └── types/
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── package.json
└── .env.example
```

## Main App Setup

Prerequisites:

- Node.js 20+
- npm
- Python 3.10+ for the AI and analytics services

If you are already inside the `cleanflow/` folder:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

If starting from the repository root used in this submission:

```bash
cd cleanflow
npm install
npm run dev
```

## Environment Variables

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

Important values:

```env
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
AUTH_URL=http://localhost:3000
ANALYTICS_API_KEY=dev-key
ANALYTICS_SNAPSHOT_PATH=python-analytics/output/analytics_snapshot.json
CLEANFLOW_API_URL=http://localhost:3000
NEXT_PUBLIC_DIGITAL_TWIN_URL=http://localhost:5173
ENABLE_REAL_AI=false 
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Notes:

- The app can run with mock AI estimation when `ENABLE_REAL_AI=false`.
- To use Gemini vision for the laundry photo estimator, set `ENABLE_REAL_AI=true` and add `GEMINI_API_KEY`.
- Database credentials will be provided separately and should not be committed.

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Customer | `customer@demo.com` | `password123` |
| Customer 2 | `customer2@demo.com` | `password123` |
| Admin | `admin@demo.com` | `password123` |
| Driver | `driver@demo.com` | `password123` |

## AI Run Commands

Run each service in a separate terminal when demoing AI features locally.

### 1. Main CleanFlow Website

```bash
cd cleanflow
npm install
npm run dev
```

This starts the Next.js app at [http://localhost:3000](http://localhost:3000).

### 2. AI Stylist Chat Service

```bash
cd cleanflow/ai_stylist_recommender
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 main.py
```

This starts the local stylist API on port `8005`. The website calls this service for style-chat responses.

### 3. AI Rental Recommendation Service

```bash
cd cleanflow/src/lib/ai-for-rental
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 server_marqo.py
```

This runs the FashionCLIP/Marqo rental recommendation backend using the catalog and embeddings in `src/lib/ai-for-rental/`.

### 4. AI Laundry Price Estimator

The price estimator is part of the main Next.js app, not a separate Python server.

Relevant file:

```text
src/lib/ai/analyzeLaundryImage.ts
```

To run it with mock data:

```env
ENABLE_REAL_AI=false
```

To run it with Gemini image analysis:

```env
ENABLE_REAL_AI=true
GEMINI_API_KEY=your-api-key
```

Then start the website:

```bash
cd cleanflow
npm run dev
```

## Analytics Run Commands

The analytics module is in:

```text
python-analytics/
```

Setup:

```bash
cd cleanflow/python-analytics
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Build the analytics snapshot used by the admin analytics page:

```bash
python3 build_snapshot.py
```

Optional workflow:

```bash
python3 fetch_orders.py
python3 build_snapshot.py
```

More details are in `python-analytics/README.md`.

## Digital Twin Run Commands

The digital twin dashboard is in:

```text
digital-twin/
```

Run the digital twin in a separate terminal:

```bash
cd cleanflow/digital-twin
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

The digital twin is a separate React/Vite dashboard that simulates a compressed CleanFlow workday across Singapore. It shows trucks, pickup/dropoff orders, demand zones, congestion, route activity, and analytics-driven insights.

Optional live backend connection:

```bash
cd cleanflow
npm run dev
```

When the main CleanFlow app is also running at `http://localhost:3000`, the digital twin can use backend/API data through endpoints such as:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/dispatch/live` | Live driver positions and active deliveries. |
| `GET /api/analytics/snapshot` | Analytics snapshot generated by the Python analytics pipeline. |

More details are in `digital-twin/README.md`.

## Suggested Demo Flow

1. Open the hosted site link, or run the local app at `http://localhost:3000`.
2. Log in as a customer using `customer@demo.com` / `password123`.
3. Create a new laundry order and upload a clothing image.
4. Review the AI-generated item estimate and pricing draft.
5. Log in as admin using `admin@demo.com` / `password123`.
6. Review submitted orders, update statuses, approve pickups, and view analytics.
7. If the AI stylist services are running locally, test the rental/style recommendation features.
8. Open the digital twin at `http://localhost:5173` to show the logistics simulation and fleet operations view.

## Technology Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Prisma 7
- PostgreSQL / Supabase
- Tailwind CSS
- Python FastAPI services for AI features
- Gemini vision integration for laundry image analysis
- Python analytics with pandas/numpy style workflows
- Vite, Leaflet, and React Leaflet for the digital twin dashboard

## Notes for Professor

This project is intended as a functional prototype, not just a static mockup. The core app demonstrates how a traditional laundry and dry-cleaning service can be transformed using:

- Digital ordering and pickup scheduling
- Customer/admin role-based workflows
- AI-assisted laundry photo analysis
- AI fashion/rental recommendation support
- Python analytics for operational and business insights
- Digital twin simulation for fleet logistics and route operations
- Admin dashboards for tracking orders and decision-making

