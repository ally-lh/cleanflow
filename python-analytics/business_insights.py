"""
Business metrics: revenue by service type, turnaround, pickup vs collection mix.
"""

from __future__ import annotations

import json
from typing import Any

import numpy as np
import pandas as pd


def run_business_insights(df: pd.DataFrame) -> dict[str, Any]:
    out: dict[str, Any] = {"ok": True}
    if df.empty:
        return {"ok": False, "reason": "empty_dataframe"}

    # Revenue by service type
    if "serviceType" in df.columns:
        amt = None
        for col in ("finalTotal", "confirmedTotal", "estimatedTotal"):
            if col in df.columns and df[col].notna().any():
                amt = col
                break
        if amt:
            g = df.groupby("serviceType", dropna=False)[amt].agg(["sum", "count", "mean"])
            out["revenueByServiceType"] = {
                str(k): {
                    "sum": float(v["sum"]) if pd.notna(v["sum"]) else None,
                    "count": int(v["count"]),
                    "mean": float(v["mean"]) if pd.notna(v["mean"]) else None,
                }
                for k, v in g.iterrows()
            }
        else:
            out["revenueByServiceType"] = df["serviceType"].value_counts().to_dict()
            out["revenueByServiceType"] = {str(k): int(v) for k, v in out["revenueByServiceType"].items()}
    else:
        out["revenueByServiceType"] = {}

    # Turnaround (hours): completedAt - createdAt
    if "createdAt" in df.columns and "completedAt" in df.columns:
        c = pd.to_datetime(df["createdAt"], errors="coerce")
        d = pd.to_datetime(df["completedAt"], errors="coerce")
        delta = (d - c).dt.total_seconds() / 3600.0
        valid = delta.dropna()
        valid = valid[valid >= 0]
        if len(valid) > 0:
            out["turnaroundHours"] = {
                "median": float(np.median(valid)),
                "mean": float(valid.mean()),
                "p90": float(np.percentile(valid, 90)),
                "sampleSize": int(len(valid)),
            }
        else:
            out["turnaroundHours"] = {"ok": False, "reason": "no_completed_pairs"}
    else:
        out["turnaroundHours"] = {"ok": False, "reason": "missing_timestamps"}

    # Pickup method vs collection method
    if "pickupMethod" in df.columns:
        out["pickupMethodCounts"] = df["pickupMethod"].value_counts(dropna=False).astype(int).to_dict()
        out["pickupMethodCounts"] = {str(k): int(v) for k, v in out["pickupMethodCounts"].items()}
    if "collectionMethod" in df.columns:
        out["collectionMethodCounts"] = (
            df["collectionMethod"].value_counts(dropna=False).astype(int).to_dict()
        )
        out["collectionMethodCounts"] = {
            str(k): int(v) for k, v in out["collectionMethodCounts"].items()
        }

    return out


if __name__ == "__main__":
    from fetch_orders import fetch_all_orders

    print(json.dumps(run_business_insights(fetch_all_orders()), indent=2, default=str))
