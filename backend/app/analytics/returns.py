"""
Returns / leakage intelligence — notebook cell 13.

Calculates return rates by:
  - SKU (StockCode)
  - Customer Segment
  - Month

Products / segments above the portfolio average return rate are flagged.
Also returns a per-customer return-rate Series used by the risk scorer.
"""
from __future__ import annotations

import pandas as pd


def returns_intelligence(
    sales_df: pd.DataFrame,
    returns_df: pd.DataFrame,
    rfm_df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.Series, float]:
    """
    Compute return rates across multiple breakdowns.

    Parameters
    ----------
    sales_df, returns_df : pd.DataFrame
        Both need CustomerID, InvoiceDate, LineValue, StockCode.
    rfm_df : pd.DataFrame
        Must contain CustomerID and Segment.

    Returns
    -------
    leakage_df : pd.DataFrame
        Rows for KeyType in {SKU, Segment, Month} with columns:
        KeyType, Key, Sales, Returns, ReturnRate, Flagged.
    cust_return_rate : pd.Series
        Index = CustomerID, values = return rate (0-1).
    portfolio_avg : float
        Overall portfolio return rate.
    """
    # Handle empty returns gracefully
    if returns_df.empty:
        # No returns at all
        empty = pd.DataFrame(
            columns=["KeyType", "Key", "Sales", "Returns", "ReturnRate", "Flagged"]
        )
        cust_rr = pd.Series(dtype=float)
        return empty, cust_rr, 0.0

    seg = rfm_df.set_index("CustomerID")["Segment"]

    def _prep(df: pd.DataFrame) -> pd.DataFrame:
        d = df.copy()
        d["Month"] = d["InvoiceDate"].dt.to_period("M").astype(str)
        d["Segment"] = d["CustomerID"].map(seg)
        d["Value"] = d["LineValue"].abs()
        return d

    s = _prep(sales_df)
    r = _prep(returns_df)

    parts: list[pd.DataFrame] = []
    for keytype, col in [
        ("SKU", "StockCode"),
        ("Segment", "Segment"),
        ("Month", "Month"),
        ("Customer", "CustomerID"),
    ]:
        a = s.groupby(col)["Value"].sum().rename("Sales")
        b = r.groupby(col)["Value"].sum().rename("Returns")
        t = (
            pd.concat([a, b], axis=1)
            .fillna(0)
            .reset_index()
            .rename(columns={col: "Key"})
        )
        t.insert(0, "KeyType", keytype)
        parts.append(t)

    allk = pd.concat(parts, ignore_index=True)
    total_rv = allk["Sales"] + allk["Returns"]
    allk["ReturnRate"] = (allk["Returns"] / total_rv.replace(0, float("nan"))).fillna(0)

    # Portfolio average = total returns / total (sales + returns)
    total_sales_val = s["Value"].sum()
    total_return_val = r["Value"].sum()
    denom = total_sales_val + total_return_val
    portfolio_avg = float(total_return_val / denom) if denom > 0 else 0.0
    allk["Flagged"] = allk["ReturnRate"] > portfolio_avg

    cust_rr = (
        allk[allk["KeyType"] == "Customer"]
        .set_index("Key")["ReturnRate"]
    )
    leakage_df = allk[allk["KeyType"] != "Customer"].reset_index(drop=True)

    return leakage_df, cust_rr, portfolio_avg
