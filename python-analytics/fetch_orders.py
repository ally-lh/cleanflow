"""
CleanFlow — Order Data Fetcher
Pulls order data from the CleanFlow API and saves to CSV for analysis.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Tuple

import pandas as pd
import requests


API_URL = os.getenv("CLEANFLOW_API_URL", "http://localhost:3000").rstrip("/")
API_KEY = os.getenv("ANALYTICS_API_KEY", "")
DEFAULT_PAGE_SIZE = 500


def _parse_datetime_columns(df: pd.DataFrame) -> pd.DataFrame:
    for col in ["createdAt", "confirmedAt", "pickedUpAt", "completedAt"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    return df


def fetch_orders_page(
    limit: int = DEFAULT_PAGE_SIZE, offset: int = 0
) -> Tuple[pd.DataFrame, dict]:
    """Fetch one page from the analytics API. Returns (DataFrame, raw meta)."""
    url = f"{API_URL}/api/analytics/orders"
    headers = {
    "Authorization": "anything-random-for-now",
    "Content-Type": "application/json"
    }
    params = {"limit": limit, "offset": offset}

    response = requests.get(url, headers=headers, params=params, timeout=120)
    response.raise_for_status()

    payload = response.json()
    rows = payload.get("data", [])
    df = pd.DataFrame(rows)
    meta = {
        "count": payload.get("count", len(rows)),
        "total": payload.get("total", len(rows)),
    }
    if not df.empty:
        df = _parse_datetime_columns(df)
    return df, meta


def fetch_all_orders(page_size: int = DEFAULT_PAGE_SIZE) -> pd.DataFrame:
    """Fetch all orders from the analytics API using offset pagination."""
    frames: list[pd.DataFrame] = []
    offset = 0
    total: int | None = None

    while True:
        df, meta = fetch_orders_page(limit=page_size, offset=offset)
        total = meta.get("total", total)
        n = len(df)
        if n == 0:
            break
        frames.append(df)
        offset += n
        if total is not None and offset >= total:
            break
        if n < page_size:
            break

    if not frames:
        return pd.DataFrame()

    out = pd.concat(frames, ignore_index=True)
    print(f"Fetched {len(out)} orders (reported total: {total})")
    return out


def load_orders_csv(path: str) -> pd.DataFrame:
    """Load a previously saved orders CSV (re-run analyses without calling the API)."""
    df = pd.read_csv(path)
    return _parse_datetime_columns(df)


def save_to_csv(df: pd.DataFrame, output_dir: str = "./data") -> str:
    os.makedirs(output_dir, exist_ok=True)
    filename = f"{output_dir}/orders_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    df.to_csv(filename, index=False)
    print(f"Saved to {filename}")
    return filename


if __name__ == "__main__":
    df = fetch_all_orders()
    print(df.head())
    print(f"\nShape: {df.shape}")
    if not df.empty and "status" in df.columns:
        print(f"\nStatus breakdown:\n{df['status'].value_counts()}")
    save_to_csv(df)
