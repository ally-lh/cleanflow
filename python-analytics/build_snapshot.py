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

from business_insights import run_business_insights
from expansion_model import run_expansion
from fetch_orders import fetch_all_orders, load_orders_csv
from geo_analysis import run_geo_bundle

DEFAULT_OUT = Path(__file__).resolve().parent / "output" / "analytics_snapshot.json"


def build_snapshot(df, source: str) -> dict:
    geo = run_geo_bundle(df)
    business = run_business_insights(df)
    expansion = run_expansion(df)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "sourceOrderCount": int(len(df)),
        "geo": geo,
        "business": business,
        "expansion": expansion,
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
