# CleanFlow — Digital Twin Dashboard

A real-time fleet operations dashboard that simulates CleanFlow's laundry logistics across Singapore.

## Quick Start

```bash
# 1. Install dependencies
cd digital-twin
npm install

# 2. Start the dashboard
npm run dev
```

Open `http://localhost:5173`. The dashboard runs a workday simulation automatically.

To connect to the live backend (optional):
```bash
# In the project root, start the Next.js server
npm run dev
```
The Vite dev server proxies `/api` requests to `localhost:3000`.

## What It Does

The dashboard simulates a compressed 8-hour workday (8am–4pm) in ~5 minutes:

- **8 trucks** depart from a central depot
- **Delivery runs**: trucks deliver clean laundry (yesterday's collections) to multiple customer locations
- **Collection runs**: trucks collect dirty laundry from customers and return to depot
- **Congestion**: trucks slow down during AM/PM peak hours in high-risk districts
- **Late detection**: orders flagged when delivery exceeds time threshold

### Key Features

- **Dark Leaflet map** with real Singapore road paths
- **Truck markers** with direction-of-travel arrows and status colors
- **Order pins**: amber = collection pickup, cyan = delivery dropoff
- **Fleet Activity panel** (bottom-right): live status of all 8 trucks
- **Analytics Insights panel** (bottom-left): contextual recommendations powered by Python analytics data
- **HUD bar** (top): sim clock, collected/delivered counts, on-time %, speed toggle
- **Day summary**: end-of-day stats with "Start Next Day" option
- **Layer toggles**: trucks, routes, orders, demand zones, density, congestion, expansion

### Analytics Integration

The dashboard consumes data from `python-analytics/`:
- **Congestion data**: district risk levels, peak-hour factors, optimal dispatch windows
- **Demand patterns**: order density by postal district
- **Expansion opportunities**: high-demand districts far from depot
- **Route optimization**: baseline vs optimized distance savings

If the analytics snapshot is unavailable, built-in fallback data ensures all recommendations still work.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** (dev server + build)
- **Leaflet** + **react-leaflet** (map)
- **Tailwind CSS** (styling)

## Project Structure

```
digital-twin/
  src/
    App.tsx                         # Main shell
    types.ts                        # TypeScript interfaces
    hooks/
      useWorkdaySim.ts              # Workday simulation engine
      useDispatchLive.ts            # Live API polling (when backend available)
      useAnalyticsSnapshot.ts       # Analytics data fetching
    lib/
      simTypes.ts                   # Simulation types & constants
      simPathBuilder.ts             # Road path routing (multi-hop)
      simCongestion.ts              # Congestion speed modifiers
      simOrderGenerator.ts          # Day plan generation
      recommendations.ts            # Contextual recommendation engine
      roadPaths.ts                  # Singapore road coordinate data
      congestionData.ts             # District congestion config
      districtCentroids.ts          # Postal district locations
      layerConfig.ts                # Map layer configuration
      truckIcon.ts                  # Truck marker SVG icons
    components/
      TwinMap.tsx                   # Leaflet map with all layers
      layers/                       # Map overlay layers
      overlays/                     # HUD, fleet panel, insights, etc.
  public/
    analytics_snapshot.json         # Fallback analytics data
```

## API Endpoints (from Next.js backend)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/dispatch/live` | Live driver positions + active deliveries |
| `GET /api/analytics/snapshot` | Analytics data from Python pipeline (requires admin auth) |

## Build

```bash
npm run build    # Output to digital-twin/dist/
```
