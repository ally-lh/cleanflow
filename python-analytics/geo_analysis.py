"""
Spatial analysis: clustering, order density by district, route optimization (TSP heuristic).
Uses pandas + numpy + scikit-learn. Distances: haversine km × road factor (aligns with app placeholder routing).
"""

from __future__ import annotations

import json
import os
from typing import Any

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans

# Default depot matches src/lib/geo/geocoding.ts STORE_GEO
DEFAULT_DEPOT_LAT = 1.3048
DEFAULT_DEPOT_LNG = 103.8318
ROAD_FACTOR = float(os.getenv("ANALYTICS_ROAD_FACTOR", "1.4"))
MAX_STOPS_ROUTE = int(os.getenv("ANALYTICS_MAX_ROUTE_STOPS", "200"))


def get_depot() -> tuple[float, float]:
    lat = float(os.getenv("DEPOT_LAT", str(DEFAULT_DEPOT_LAT)))
    lng = float(os.getenv("DEPOT_LNG", str(DEFAULT_DEPOT_LNG)))
    return lat, lng


def haversine_km(
    lat1: np.ndarray,
    lon1: np.ndarray,
    lat2: np.ndarray,
    lon2: np.ndarray,
) -> np.ndarray:
    """Elementwise haversine distance in km."""
    r = 6371.0
    p1 = np.radians(lat1)
    p2 = np.radians(lat2)
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = np.sin(dlat / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dlon / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def _closed_tour_km(
    depot: tuple[float, float],
    coords: np.ndarray,
    order: list[int],
) -> float:
    """coords shape (n, 2); order is permutation of 0..n-1. Depot -> stops -> depot."""
    if not order:
        return 0.0
    dlat, dlng = depot
    total = float(
        haversine_km(
            np.array([dlat]),
            np.array([dlng]),
            np.array([coords[order[0], 0]]),
            np.array([coords[order[0], 1]]),
        )[0]
    )
    for i in range(len(order) - 1):
        a, b = order[i], order[i + 1]
        total += float(
            haversine_km(
                np.array([coords[a, 0]]),
                np.array([coords[a, 1]]),
                np.array([coords[b, 0]]),
                np.array([coords[b, 1]]),
            )[0]
        )
    last = order[-1]
    total += float(
        haversine_km(
            np.array([coords[last, 0]]),
            np.array([coords[last, 1]]),
            np.array([dlat]),
            np.array([dlng]),
        )[0]
    )
    return total * ROAD_FACTOR


def _nearest_neighbor_route(depot: tuple[float, float], coords: np.ndarray) -> list[int]:
    n = coords.shape[0]
    if n == 0:
        return []
    unvisited = set(range(n))
    route: list[int] = []
    dlat, dlng = depot
    # first: nearest to depot
    dists = haversine_km(
        np.full(n, dlat),
        np.full(n, dlng),
        coords[:, 0],
        coords[:, 1],
    )
    current = int(np.argmin(dists))
    route.append(current)
    unvisited.remove(current)
    while unvisited:
        last = route[-1]
        dists = {
            j: float(
                haversine_km(
                    np.array([coords[last, 0]]),
                    np.array([coords[last, 1]]),
                    np.array([coords[j, 0]]),
                    np.array([coords[j, 1]]),
                )[0]
            )
            for j in unvisited
        }
        nxt = min(dists, key=dists.get)  # type: ignore[arg-type]
        route.append(nxt)
        unvisited.remove(nxt)
    return route


def _two_opt_improve(
    depot: tuple[float, float], coords: np.ndarray, route: list[int]
) -> list[int]:
    """2-opt on fixed endpoints (closed tour via _closed_tour_km)."""
    if len(route) < 4:
        return route
    best = route[:]
    best_len = _closed_tour_km(depot, coords, best)
    # Keep this bounded — full 2-opt with repeated O(n) tour length is too slow for large n.
    max_passes = min(40, max(5, len(route) // 2))
    for _ in range(max_passes):
        improved = False
        for i in range(len(best) - 1):
            for k in range(i + 2, len(best)):
                new_r = best[: i + 1] + best[i + 1 : k + 1][::-1] + best[k + 1 :]
                ln = _closed_tour_km(depot, coords, new_r)
                if ln + 1e-9 < best_len:
                    best = new_r
                    best_len = ln
                    improved = True
                    break
            if improved:
                break
        if not improved:
            break
    return best


def run_route_optimization(df: pd.DataFrame) -> dict[str, Any]:
    depot = get_depot()
    dlat, dlng = depot

    work = df.copy()
    if "lat" not in work.columns or "lng" not in work.columns:
        return {
            "ok": False,
            "reason": "missing_lat_lng_columns",
            "depot": {"lat": dlat, "lng": dlng},
        }

    work = work.dropna(subset=["lat", "lng"])
    work = work[(work["lat"].between(-90, 90)) & (work["lng"].between(-180, 180))]
    # exclude draft/cancelled if status present
    if "status" in work.columns:
        work = work[~work["status"].isin(["DRAFT", "CANCELLED"])]

    if len(work) == 0:
        return {
            "ok": False,
            "reason": "no_rows_with_valid_coordinates",
            "depot": {"lat": dlat, "lng": dlng},
        }

    if len(work) > MAX_STOPS_ROUTE:
        work = work.sample(MAX_STOPS_ROUTE, random_state=42)

    coords = work[["lat", "lng"]].to_numpy(dtype=float)
    order_ids = work["orderId"].astype(str).tolist()

    baseline_order = list(range(len(work)))
    baseline_order.sort(key=lambda i: order_ids[i])
    baseline_km = _closed_tour_km(depot, coords, baseline_order)

    nn = _nearest_neighbor_route(depot, coords)
    # Skip 2-opt for large instances (still report NN route as "optimized").
    opt = (
        _two_opt_improve(depot, coords, nn)
        if len(nn) <= 100
        else nn
    )
    optimized_km = _closed_tour_km(depot, coords, opt)

    optimized_ids = [order_ids[i] for i in opt]
    savings = baseline_km - optimized_km
    savings_pct = (savings / baseline_km * 100) if baseline_km > 0 else 0.0

    return {
        "ok": True,
        "depot": {"lat": dlat, "lng": dlng},
        "roadFactor": ROAD_FACTOR,
        "twoOptApplied": len(nn) <= 100,
        "nStops": len(opt),
        "optimizedOrderIds": optimized_ids[:50],
        "optimizedOrderIdsTruncated": len(optimized_ids) > 50,
        "baselineKm": round(baseline_km, 3),
        "optimizedKm": round(optimized_km, 3),
        "savingsKm": round(savings, 3),
        "savingsPercent": round(float(savings_pct), 2),
        "assumption": "Haversine × road factor; closed tour depot→stops→depot (see README).",
    }


def run_clustering(df: pd.DataFrame, k: int | None = None) -> dict[str, Any]:
    work = df.dropna(subset=["lat", "lng"]).copy()
    if len(work) < 3:
        return {"ok": False, "reason": "need_at_least_3_points_with_lat_lng"}
    n = len(work)
    k_use = k if k is not None else max(2, min(8, max(1, n // 5)))
    k_use = max(2, min(k_use, n))

    X = work[["lat", "lng"]].to_numpy()
    km = KMeans(n_clusters=k_use, random_state=42, n_init=10)
    labels = km.fit_predict(X)
    work["_cluster"] = labels

    sizes = work.groupby("_cluster").size().to_dict()
    sizes = {str(int(k)): int(v) for k, v in sizes.items()}
    centers = [
        {"lat": float(c[0]), "lng": float(c[1])} for c in km.cluster_centers_.tolist()
    ]

    return {
        "ok": True,
        "k": k_use,
        "clusterSizes": sizes,
        "centroids": centers,
    }


def run_density_by_district(df: pd.DataFrame) -> dict[str, Any]:
    if "postalCode" not in df.columns or df["postalCode"].isna().all():
        return {"ok": False, "reason": "no_postal_code"}
    s = df["postalCode"].astype(str).str.strip()
    s = s[s.str.len() >= 2]
    district = s.str[:2]
    counts = district.value_counts().head(30)
    return {
        "ok": True,
        "byDistrictPrefix": counts.astype(int).to_dict(),
    }


def run_geo_bundle(df: pd.DataFrame) -> dict[str, Any]:
    return {
        "clustering": run_clustering(df),
        "densityByDistrict": run_density_by_district(df),
        "routeOptimization": run_route_optimization(df),
    }


if __name__ == "__main__":
    from fetch_orders import fetch_all_orders

    orders = fetch_all_orders()
    print(json.dumps(run_geo_bundle(orders), indent=2, default=str))
