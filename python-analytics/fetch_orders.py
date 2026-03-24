"""
CleanFlow — Order Data Fetcher
Pulls order data from the CleanFlow API and saves to CSV for analysis.
"""

import os
import requests
import pandas as pd
from datetime import datetime

API_URL = os.getenv("CLEANFLOW_API_URL", "http://localhost:3000")
API_KEY = os.getenv("ANALYTICS_API_KEY", "")


def fetch_all_orders(limit: int = 1000) -> pd.DataFrame:
    """Fetch all orders from the analytics API."""
    url = f"{API_URL}/api/analytics/orders"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    params = {"limit": limit, "offset": 0}

    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()

    data = response.json()
    print(f"Fetched {data['count']} orders (total: {data['total']})")

    df = pd.DataFrame(data["data"])

    # Parse datetimes
    for col in ["createdAt", "confirmedAt", "pickedUpAt", "completedAt"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    return df


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
    print(f"\nStatus breakdown:\n{df['status'].value_counts()}")
    save_to_csv(df)
