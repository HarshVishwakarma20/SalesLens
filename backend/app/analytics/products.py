"""
Product contribution analysis — notebook cell 15.

Metrics per SKU:
  - GrossSales       : total sales value
  - ReturnValue      : total returned value (always positive)
  - NetRevenue       : GrossSales - ReturnValue
  - BuyerCount       : distinct customers who bought this product
  - ReturnRate       : ReturnValue / (GrossSales + ReturnValue)
  - RepeatAttachRate : share of buyers who ordered on 2+ different invoices

Category assignment (based on net revenue and repeat attach rate medians):
  - Stars            : high revenue, high attach
  - Loyalty Builders : lower revenue, high attach
  - One-hit Sellers  : high revenue, low attach
  - Long Tail        : low revenue, low attach
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def product_contribution(
    sales_df: pd.DataFrame,
    returns_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Build a per-product metrics table.

    Parameters
    ----------
    sales_df, returns_df : pd.DataFrame
        Must contain StockCode, LineValue, CustomerID, InvoiceNo.
        Also uses Description if present.

    Returns
    -------
    pd.DataFrame sorted by NetRevenue descending.
    """
    # Gross sales and return value per SKU
    sold = sales_df.groupby("StockCode")["LineValue"].sum().rename("GrossSales")

    if not returns_df.empty:
        back = (
            returns_df.groupby("StockCode")["LineValue"]
            .apply(lambda x: x.abs().sum())
            .rename("ReturnValue")
        )
    else:
        back = pd.Series(dtype=float, name="ReturnValue")

    net = sold.sub(back, fill_value=0).rename("NetRevenue")

    # Buyer count
    buyers = (
        sales_df.groupby("StockCode")["CustomerID"]
        .nunique()
        .rename("BuyerCount")
    )

    # Repeat attach rate (notebook cell 15)
    per_cust = (
        sales_df.groupby(["StockCode", "CustomerID"])["InvoiceNo"]
        .nunique()
    )
    attach = (per_cust > 1).groupby(level=0).mean().rename("RepeatAttachRate")

    # Return rate
    total = sold.add(back, fill_value=0)
    return_rate = (
        back.div(total.replace(0, float("nan")))
        .fillna(0)
        .rename("ReturnRate")
    )

    product_df = (
        pd.concat([sold, back, net, buyers, attach, return_rate], axis=1)
        .fillna(0)
        .reset_index()
    )

    # Attach last-known description
    if "Description" in sales_df.columns:
        desc = (
            sales_df.groupby("StockCode")["Description"]
            .last()
            .reset_index()
        )
        product_df = product_df.merge(desc, on="StockCode", how="left")
        product_df["Description"] = product_df["Description"].fillna("Unknown")
    else:
        product_df["Description"] = "Unknown"

    product_df["Category"] = _assign_category(product_df)

    return product_df.sort_values("NetRevenue", ascending=False).reset_index(drop=True)


def _assign_category(df: pd.DataFrame) -> pd.Series:
    """
    Classify each product using the four notebook categories.
    Uses medians as thresholds to avoid hard-coding currency values.
    """
    rev_med = df["NetRevenue"].median()
    att_med = df["RepeatAttachRate"].median()

    conditions = [
        (df["NetRevenue"] >= rev_med) & (df["RepeatAttachRate"] >= att_med),
        (df["NetRevenue"] < rev_med) & (df["RepeatAttachRate"] >= att_med),
        (df["NetRevenue"] >= rev_med) & (df["RepeatAttachRate"] < att_med),
    ]
    choices = ["Stars", "Loyalty Builders", "One-hit Sellers"]
    return pd.Series(
        np.select(conditions, choices, default="Long Tail"),
        index=df.index,
    )
