# CleanFlow — Digital Twin / Logistics Simulation

This folder is for the **digital twin teammate**.

## What to build here

Simulate the delivery and pickup logistics of CleanFlow to model
efficiency, routing, and expansion scenarios.

## Architecture integration points

### Live data API

```
GET /api/dispatch/live
```

Returns:
```json
{
  "drivers": [
    { "driverId": "...", "driverName": "...", "lat": 1.3521, "lng": 103.8198, "lastUpdated": "...", "isLive": false }
  ],
  "deliveries": [
    { "orderId": "...", "orderNumber": "...", "dropoffLat": 1.35, "dropoffLng": 103.82, "status": "OUT_FOR_DELIVERY" }
  ]
}
```

### Driver location update (future)

```
POST /api/dispatch/location
Body: { "driverId": "...", "lat": ..., "lng": ..., "token": "..." }
```

## Suggested simulation components

### 1. Route simulation
- Model driver routes from store → customer → store
- Use OSRM or Google Directions API for realistic road routing
- Simulate multi-stop routes (one driver, multiple pickups)

### 2. Capacity planning
- Given N orders per day, how many drivers are needed?
- What is the average travel time per order?
- Where should a second store be located?

### 3. Three.js / 3D map dashboard (frontend)
The frontend placeholder for the 3D map is at:
`src/lib/maps/placeholder.ts`

When ready to build the 3D map:
1. Install: `npm install three @react-three/fiber @react-three/drei`
2. Create: `src/components/admin/DispatchMap.tsx`
3. Use the `DispatchBoardState` type from `src/lib/maps/placeholder.ts`
4. Fetch live data from `/api/dispatch/live` (poll every 30s or use WebSocket)

## Files to create

| File | Purpose |
|------|---------|
| `simulation.py` | Monte Carlo delivery simulation |
| `route_optimizer.py` | Multi-stop route optimization |
| `capacity_model.py` | Driver count vs order volume analysis |
| `twin_api.py` | Push simulation state to CleanFlow API |
| `notebooks/simulation.ipynb` | Interactive simulation notebook |

## Store coordinates (placeholder)

```
Store: 1.3048° N, 103.8318° E  (CleanFlow HQ placeholder)
```
