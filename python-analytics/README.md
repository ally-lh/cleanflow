# CleanFlow — Python Analytics Module

This folder is for the **data analytics teammate**.

## What to build here

Use the CleanFlow API to fetch order data and run spatial / business analysis.

### API Endpoint

```
GET /api/analytics/orders
Authorization: Bearer <ANALYTICS_API_KEY>
```

Returns flat JSON with fields:
- `orderId`, `orderNumber`, `status`, `serviceType`
- `createdAt`, `confirmedAt`, `pickedUpAt`, `completedAt`
- `postalCode`, `city`, `lat`, `lng`
- `estimatedTotal`, `confirmedTotal`, `finalTotal`, `deliveryFee`
- `totalItems`, `itemCategories`
- `estimatedPickupDistance`, `estimatedDeliveryDistance`

### Suggested analyses

1. **Geographic customer clustering** — cluster customer lat/lng by postal code or region
2. **Order density by area** — heatmap of orders per postal district
3. **Expansion opportunity** — identify areas with high demand far from current store
4. **Revenue by service type** — compare WASH_AND_FOLD vs DRY_CLEANING etc.
5. **Order turnaround time** — time from `createdAt` to `completedAt`
6. **Pickup vs drop-off split** — ratio of SCHEDULED_PICKUP to CUSTOMER_DROPOFF

### Sample Python setup

```python
# requirements.txt
requests
pandas
geopandas
shapely
folium          # for interactive maps
scikit-learn    # for clustering (KMeans, DBSCAN)
matplotlib
seaborn
jupyter
```

```python
import requests
import pandas as pd

API_URL = "http://localhost:3000/api/analytics/orders"
API_KEY = "your-key-here"

resp = requests.get(API_URL, headers={"Authorization": f"Bearer {API_KEY}"})
df = pd.DataFrame(resp.json()["data"])

# Example: orders per postal district
df["district"] = df["postalCode"].str[:2]
print(df.groupby("district").size().sort_values(ascending=False))
```

### Files to create

| File | Purpose |
|------|---------|
| `fetch_orders.py` | Pull data from API and save to CSV |
| `geo_analysis.py` | Spatial clustering and heatmaps |
| `business_insights.py` | Revenue, service type, turnaround |
| `expansion_model.py` | Identify underserved areas |
| `notebooks/eda.ipynb` | Exploratory data analysis notebook |
