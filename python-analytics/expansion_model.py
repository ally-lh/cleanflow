"""
Expansion / coverage: order volume by district vs mean distance from depot (haversine).
"""

from __future__ import annotations

import json
from typing import Any

import numpy as np
import pandas as pd

from geo_analysis import get_depot, haversine_km


def run_expansion(df: pd.DataFrame) -> dict[str, Any]:
    depot = get_depot()
    dlat, dlng = depot

    work = df.copy()
    if "postalCode" not in work.columns:
        return {"ok": False, "reason": "no_postal_code"}

    work = work.dropna(subset=["lat", "lng"])
    if work.empty:
        return {"ok": False, "reason": "no_coordinates_for_expansion"}

    if "orderId" not in work.columns:
        work = work.reset_index(drop=True)
        work["orderId"] = work.index.astype(str)

    work["district"] = work["postalCode"].astype(str).str.strip().str[:2]
    work = work[work["district"].str.len() == 2]

    dist_km = haversine_km(
        np.full(len(work), dlat),
        np.full(len(work), dlng),
        work["lat"].to_numpy(),
        work["lng"].to_numpy(),
    )
    work["_dist"] = dist_km

    agg = work.groupby("district").agg(
        orderCount=("orderId", "count"),
        meanDistKm=("_dist", "mean"),
    )
    agg = agg.sort_values("orderCount", ascending=False).head(25)

    rows = []
    for dist, row in agg.iterrows():
        rows.append(
            {
                "district": str(dist),
                "orderCount": int(row["orderCount"]),
                "meanDistanceFromDepotKm": round(float(row["meanDistKm"]), 3),
            }
        )

    # Flag "far but busy" districts (heuristic: top third by count and above median distance)
    far_busy = []
    if rows:
        counts = [r["orderCount"] for r in rows]
        dists = [r["meanDistanceFromDepotKm"] for r in rows]
        med_d = float(np.median(dists))
        thr_c = float(np.percentile(counts, 66))
        for r in rows:
            if r["orderCount"] >= thr_c and r["meanDistanceFromDepotKm"] >= med_d:
                far_busy.append(r["district"])

    return {
        "ok": True,
        "depot": {"lat": dlat, "lng": dlng},
        "districts": rows,
        "highDemandFarDistrictsHeuristic": far_busy,
        "note": "Heuristic only; use with geo_analysis clustering for site selection.",
    }


if __name__ == "__main__":
    from fetch_orders import fetch_all_orders

    print(json.dumps(run_expansion(fetch_all_orders()), indent=2, default=str))
