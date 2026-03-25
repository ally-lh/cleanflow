# CleanFlow — Python Analytics Module

This folder is for **data analytics** (pandas). Work is intended to live on the **`ANALYTICS` git branch**; avoid unrelated edits elsewhere in the repo.

## API endpoint

```
GET /api/analytics/orders
Authorization: Bearer <ANALYTICS_API_KEY>
```

Returns flat JSON with fields including: `orderId`, `orderNumber`, `status`, `serviceType`, `pickupMethod`, `collectionMethod`, timestamps, `postalCode`, `city`, `lat`, `lng`, invoice totals, `totalItems`, `itemCategories`, `estimatedPickupDistance`, `estimatedDeliveryDistance`.

Set in `.env` (or shell):

- `CLEANFLOW_API_URL` — e.g. `http://localhost:3000`
- `ANALYTICS_API_KEY` — must match the Next.js app

## Python setup

```bash
cd python-analytics
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**Always use the venv** when running scripts so `numpy`, `pandas`, etc. are found:

```bash
source .venv/bin/activate   # once per terminal session
python3 build_snapshot.py
```

Using the system `python3` without installing packages or without activating `.venv` causes `ModuleNotFoundError: No module named 'numpy'`.

## Scripts

| File | Purpose |
|------|---------|
| `fetch_orders.py` | Paginated fetch from API; `save_to_csv()` writes under `data/` |
| `geo_analysis.py` | Clustering (K-means), density by postal prefix, **route optimization** (nearest-neighbor + 2-opt, haversine × road factor) |
| `business_insights.py` | Revenue by service type, turnaround hours, pickup/collection counts |
| `expansion_model.py` | Demand by district vs mean distance from depot |
| `build_snapshot.py` | Writes `output/analytics_snapshot.json` for **`/admin/analytics`** |
| `notebooks/eda.ipynb` | Exploratory analysis |

### Route optimization (A) vs optional logistics API (B)

- **(A) Implemented here:** Uses only `lat`/`lng` from the orders export. Depot defaults to store coordinates in `src/lib/geo/geocoding.ts` (`STORE_GEO`). Override with env: `DEPOT_LAT`, `DEPOT_LNG`. Optional: `ANALYTICS_ROAD_FACTOR` (default `1.4`), `ANALYTICS_MAX_ROUTE_STOPS` (default `200`).
- **(B) Not required:** A richer `GET /api/analytics/logistics` with `RouteEstimate.rawResponse` would be for traffic / DB-backed durations—**optional** future work.

### Admin UI

After generating a snapshot, open **`/admin/analytics`** (admin login required). The page reads `output/analytics_snapshot.json`. Override path with env **`ANALYTICS_SNAPSHOT_PATH`** on the Next.js process if needed.

`GET /api/analytics/snapshot` returns the same JSON **for admins only** (session cookie).

## Typical workflow

```bash
# 1) Fetch and save a checkpoint CSV (timestamped — keep for replay)
python fetch_orders.py

# 2) Build snapshot for the website
python build_snapshot.py

# Re-run analysis from a saved CSV (no API call)
python build_snapshot.py --csv data/orders_20250324_120000.csv
```

## Going back / checkpoints (rollback-friendly)

1. **Timestamped CSVs** — Each `fetch_orders.py` run can save `data/orders_YYYYMMDD_HHMMSS.csv`. Re-run `build_snapshot.py --csv <file>` to reproduce analysis without hitting the API.
2. **Snapshot backup** — `output/analytics_snapshot.json` is overwritten each build. Copy it before re-running if you want a named backup, e.g. `cp output/analytics_snapshot.json output/snapshot_backup_20250324.json`.
3. **Git** — Commit on the **`ANALYTICS` branch** in small steps so you can `git revert` or reset to a prior commit. (Use your normal git workflow; no special tooling required.)

## Suggested analyses (README)

1. Geographic clustering — `geo_analysis.py`
2. Order density by area — `geo_analysis.py` (`densityByDistrict`)
3. Expansion opportunity — `expansion_model.py`
4. Revenue by service type — `business_insights.py`
5. Turnaround time — `business_insights.py`
6. Pickup vs drop-off — `business_insights.py`

Sample snippet:

```python
import requests
import pandas as pd

API_URL = "http://localhost:3000/api/analytics/orders"
API_KEY = "your-key-here"

resp = requests.get(API_URL, headers={"Authorization": f"Bearer {API_KEY}"})
df = pd.DataFrame(resp.json()["data"])

df["district"] = df["postalCode"].astype(str).str[:2]
print(df.groupby("district").size().sort_values(ascending=False))
```
