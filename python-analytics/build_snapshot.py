"""
Aggregate geo, business, and expansion analyses into one JSON for the admin UI.

Usage:
  python build_snapshot.py              # fetch all orders from API, then analyze
  python build_snapshot.py --csv data/orders_20250101_120000.csv   # re-run from saved CSV

Checkpointing: each `fetch_orders.save_to_csv` creates a timestamped file under data/.
Keep those files to reproduce or roll back analysis without re-fetching.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from business_insights import run_business_insights
from expansion_model import run_expansion
from fetch_orders import fetch_all_orders, load_orders_csv
from geo_analysis import run_geo_bundle, run_route_optimization

DEFAULT_OUT = Path(__file__).resolve().parent / "output" / "analytics_snapshot.json"


def _pick_revenue_column(df):
    for col in ("finalTotal", "confirmedTotal", "estimatedTotal"):
        if col in df.columns and df[col].notna().any():
            return col
    return None


def _kpis(df, driver_rows):
    total_orders = int(len(df))
    revenue_col = _pick_revenue_column(df)
    if revenue_col:
        total_revenue = float(df[revenue_col].fillna(0).sum())
        n = int(df[revenue_col].notna().sum())
        avg_order_value = float(total_revenue / n) if n > 0 else 0.0
    else:
        total_revenue = 0.0
        avg_order_value = 0.0

    total_saved = float(sum(r.get("savingsKm", 0) for r in driver_rows))
    baseline_total = float(sum(r.get("baselineKm", 0) for r in driver_rows))
    avg_savings_rate = float((total_saved / baseline_total) * 100) if baseline_total > 0 else 0.0
    return {
        "totalOrders": total_orders,
        "totalRevenue": round(total_revenue, 2),
        "avgOrderValue": round(avg_order_value, 2),
        "totalDistanceSavedKm": round(total_saved, 2),
        "avgSavingsRatePercent": round(avg_savings_rate, 2),
    }


def _derive_driver_id(row) -> str | None:
    did = row.get("deliveryDriverId") or row.get("pickupDriverId")
    if did is None or (isinstance(did, float) and pd.isna(did)):
        return None
    return str(did)

def _derive_driver_name(row) -> str | None:
    name = row.get("deliveryDriverName") or row.get("pickupDriverName")
    if name is None or (isinstance(name, float) and pd.isna(name)):
        return None
    return str(name)


def _driver_operational(df):
    work = df.copy()
    # Ensure expected columns exist
    for col in ("pickupDriverId", "deliveryDriverId", "pickupDriverName", "deliveryDriverName"):
        if col not in work.columns:
            work[col] = None
    work["driverId"] = work.apply(_derive_driver_id, axis=1)
    work["driverName"] = work.apply(_derive_driver_name, axis=1)
    work_valid = work.dropna(subset=["driverId"])
    drivers = sorted(set(work_valid["driverId"].astype(str).tolist()))

    # If no real driver assignments, return empty (UI can show fallback)
    if not drivers:
        return {"drivers": [], "scatterStopsVsDistance": []}

    rows = []
    scatter = []
    for driver_id in drivers:
        sub = work_valid[work_valid["driverId"].astype(str) == driver_id]
        # Prefer a stable label if available
        label = None
        if "driverName" in sub.columns:
            non_null = sub["driverName"].dropna()
            if not non_null.empty:
                label = str(non_null.iloc[0])
        # Reuse route optimization on the subset (handles coord filtering internally)
        route = run_route_optimization(sub)
        if not route.get("ok"):
            continue
        rows.append(
            {
                "driverId": driver_id,
                "driverLabel": label or driver_id,
                "baselineKm": float(route.get("baselineKm", 0)),
                "optimizedKm": float(route.get("optimizedKm", 0)),
                "savingsKm": float(route.get("savingsKm", 0)),
                "savingsPercent": float(route.get("savingsPercent", 0)),
                "stops": int(route.get("nStops", 0)),
            }
        )
        scatter.append(
            {
                "driverId": driver_id,
                "driverLabel": label or driver_id,
                "stops": int(route.get("nStops", 0)),
                "distanceKm": float(route.get("optimizedKm", 0)),
            }
        )

    # sort descending for charts
    rows.sort(key=lambda r: r["savingsKm"], reverse=True)
    scatter.sort(key=lambda r: r["stops"], reverse=True)
    return {"drivers": rows, "scatterStopsVsDistance": scatter}


def _revenue_mix(business):
    rev = (business or {}).get("revenueByServiceType") or {}
    rows = []
    total = 0.0
    for _, metric in rev.items():
        s = metric.get("sum") if isinstance(metric, dict) else None
        if isinstance(s, (int, float)):
            total += float(s)
    for service_type, metric in rev.items():
        if not isinstance(metric, dict):
            continue
        s = float(metric.get("sum") or 0)
        c = float(metric.get("count") or 0)
        m = float(metric.get("mean") or 0)
        pct = (s / total * 100) if total > 0 else 0.0
        rows.append(
            {
                "serviceType": str(service_type),
                "revenue": round(s, 2),
                "avgOrderValue": round(m, 2),
                "orderCount": int(c),
                "revenuePercent": round(pct, 2),
            }
        )
    rows.sort(key=lambda r: r["revenue"], reverse=True)
    return {"services": rows, "totalRevenue": round(total, 2)}


def _time_series(df):
    if "createdAt" not in df.columns:
        return {"daily": []}
    s = df.copy()
    s["createdAt"] = pd.to_datetime(s["createdAt"], errors="coerce")
    s = s.dropna(subset=["createdAt"])
    if s.empty:
        return {"daily": []}
    s["day"] = s["createdAt"].dt.date.astype(str)
    agg = s.groupby("day").size().reset_index(name="orders")
    rows = [{"date": str(r["day"]), "orders": int(r["orders"])} for _, r in agg.iterrows()]
    rows.sort(key=lambda r: r["date"])
    return {"daily": rows}


def build_snapshot(df, source: str) -> dict:
    geo = run_geo_bundle(df)
    business = run_business_insights(df)
    expansion = run_expansion(df)
    operational = _driver_operational(df)
    kpis = _kpis(df, operational.get("drivers", []))
    revenue_mix = _revenue_mix(business)
    demand_top = (geo.get("densityByDistrict") or {}).get("byDistrictPrefix") or {}
    top_districts = [
        {"district": str(k), "orders": int(v)} for k, v in demand_top.items()
    ]
    top_districts.sort(key=lambda r: r["orders"], reverse=True)
    top_districts = top_districts[:15]
    time_series = _time_series(df)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "sourceOrderCount": int(len(df)),
        "geo": geo,
        "business": business,
        "expansion": expansion,
        "charts": {
            "kpis": kpis,
            "operationalEfficiency": operational,
            "revenueMix": revenue_mix,
            "demandPatterns": {
                "topDistricts": top_districts,
            },
            "expansionAnalysis": {
                "rankedDistricts": (expansion or {}).get("districts") or [],
            },
            "timeSeries": time_series,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build analytics_snapshot.json")
    parser.add_argument(
        "--csv",
        type=str,
        default=None,
        help="Path to orders CSV from fetch_orders.save_to_csv (skip API fetch)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        default=str(DEFAULT_OUT),
        help="Output JSON path",
    )
    args = parser.parse_args()

    if args.csv:
        path = Path(args.csv)
        if not path.is_file():
            raise SystemExit(f"CSV not found: {path}")
        df = load_orders_csv(str(path))
        source = f"csv:{path.name}"
    else:
        df = fetch_all_orders()
        source = "api:/api/analytics/orders"

    snap = build_snapshot(df, source=source)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(snap, f, indent=2, default=str)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
