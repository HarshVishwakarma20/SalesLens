"""
Customer journey analysis — notebook cell 6.

For each customer we calculate:
  - first / last purchase date
  - order count
  - total revenue
  - average gap between consecutive orders (days)
  - gap trend: slope of the gap sequence (positive = orders slowing down)
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def build_customer_journey(sales_df: pd.DataFrame) -> pd.DataFrame:
    """
    Build a one-row-per-customer journey table.

    Parameters
    ----------
    sales_df : pd.DataFrame
        Sales transactions with at least CustomerID, InvoiceNo,
        InvoiceDate, and LineValue columns.

    Returns
    -------
    pd.DataFrame
        Columns: CustomerID, FirstPurchaseDate, LastPurchaseDate,
        OrderCount, TotalRevenue, AvgGap, GapTrend
    """
    if sales_df.empty:
        return pd.DataFrame(
            columns=[
                "CustomerID",
                "FirstPurchaseDate",
                "LastPurchaseDate",
                "OrderCount",
                "TotalRevenue",
                "AvgGap",
                "GapTrend",
            ]
        )

    # Collapse line items into one row per invoice
    inv = (
        sales_df.groupby(["CustomerID", "InvoiceNo"])
        .agg(
            InvoiceDate=("InvoiceDate", "min"),
            InvoiceValue=("LineValue", "sum"),
        )
        .reset_index()
        .sort_values(["CustomerID", "InvoiceDate"])
    )

    rows: list[dict] = []
    for cust, g in inv.groupby("CustomerID"):
        dates = g["InvoiceDate"].values
        gaps = np.diff(dates) / np.timedelta64(1, "D")  # convert to days

        avg_gap: float | None = float(gaps.mean()) if len(gaps) > 0 else None
        gap_trend: float = (
            float(np.polyfit(np.arange(len(gaps)), gaps, 1)[0])
            if len(gaps) >= 2
            else 0.0
        )

        rows.append(
            {
                "CustomerID": int(cust),
                "FirstPurchaseDate": g["InvoiceDate"].min(),
                "LastPurchaseDate": g["InvoiceDate"].max(),
                "OrderCount": int(len(g)),
                "TotalRevenue": round(float(g["InvoiceValue"].sum()), 2),
                "AvgGap": round(avg_gap, 4) if avg_gap is not None else None,
                "GapTrend": round(gap_trend, 6),
            }
        )

    return pd.DataFrame(rows)
