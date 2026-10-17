"""
RFM analysis and customer segmentation — notebook cell 8.

Pipeline:
  1. Calculate Recency, Frequency, Monetary per customer.
  2. Assign 1-5 scores using percentile ranks.
  3. Compute weighted RFM score (R=0.4, F=0.3, M=0.3 by default).
  4. Classify into segments using top-down sequential rules.

Segments (in priority order): Champion, Loyal, New, At-Risk, Lost, Promising
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.config import RFM_WEIGHTS


# ---------------------------------------------------------------------------
# Component calculators
# ---------------------------------------------------------------------------

def calculate_recency(
    df: pd.DataFrame,
    customer_col: str,
    date_col: str,
    ref_date: pd.Timestamp,
) -> pd.DataFrame:
    """Days since each customer's latest purchase (lower = more recent)."""
    latest = df.groupby(customer_col)[date_col].max().reset_index()
    latest["Recency"] = (ref_date - latest[date_col]).dt.days.astype(int)
    return latest[[customer_col, "Recency"]]


def calculate_frequency(
    df: pd.DataFrame,
    customer_col: str,
    invoice_col: str,
) -> pd.DataFrame:
    """Distinct invoice count per customer."""
    freq = df.groupby(customer_col)[invoice_col].nunique().reset_index()
    freq.rename(columns={invoice_col: "Frequency"}, inplace=True)
    return freq


def calculate_monetary(
    df: pd.DataFrame,
    customer_col: str,
    revenue_col: str,
) -> pd.DataFrame:
    """Total revenue per customer."""
    mon = df.groupby(customer_col)[revenue_col].sum().reset_index()
    mon.rename(columns={revenue_col: "Monetary"}, inplace=True)
    return mon


def calculate_rfm_percentiles(rfm_df: pd.DataFrame) -> pd.DataFrame:
    """
    Assign 1-5 scores based on percentile rank.
    Lower recency → higher R score (ascending=False).
    Higher frequency / monetary → higher score.
    """
    rfm = rfm_df.copy()
    rfm["R_Score"] = (
        np.ceil(rfm["Recency"].rank(pct=True, ascending=False) * 5)
        .clip(1, 5)
        .astype(int)
    )
    rfm["F_Score"] = (
        np.ceil(rfm["Frequency"].rank(pct=True, ascending=True) * 5)
        .clip(1, 5)
        .astype(int)
    )
    rfm["M_Score"] = (
        np.ceil(rfm["Monetary"].rank(pct=True, ascending=True) * 5)
        .clip(1, 5)
        .astype(int)
    )
    return rfm


def calculate_rfm_score(rfm_df: pd.DataFrame, weights: dict) -> pd.DataFrame:
    """Weighted sum of R, F, M scores."""
    rfm = rfm_df.copy()
    rfm["RFM_Score"] = (
        rfm["R_Score"] * weights.get("R", 0.4)
        + rfm["F_Score"] * weights.get("F", 0.3)
        + rfm["M_Score"] * weights.get("M", 0.3)
    )
    return rfm


def assign_segment(rfm_df: pd.DataFrame) -> pd.DataFrame:
    """
    Top-down sequential segmentation rules (notebook cell 8).
    A customer is assigned the first matching label.
    """
    rfm = rfm_df.copy()
    R, F, M = rfm["R_Score"], rfm["F_Score"], rfm["M_Score"]

    conditions = [
        (R >= 4) & (F >= 4) & (M >= 4),   # Champion
        (R >= 3) & (F >= 4),               # Loyal
        (R >= 4) & (F <= 2),               # New
        (R <= 2) & (F >= 3),               # At-Risk
        (R <= 2) & (F <= 2),               # Lost
    ]
    choices = ["Champion", "Loyal", "New", "At-Risk", "Lost"]
    rfm["Segment"] = np.select(conditions, choices, default="Promising")
    return rfm


# ---------------------------------------------------------------------------
# Full pipeline
# ---------------------------------------------------------------------------

def build_rfm_table(
    df: pd.DataFrame,
    customer_col: str = "CustomerID",
    invoice_col: str = "InvoiceNo",
    date_col: str = "InvoiceDate",
    revenue_col: str = "LineValue",
    ref_date: pd.Timestamp | None = None,
    weights: dict | None = None,
) -> pd.DataFrame:
    """
    Execute the complete RFM pipeline on a sales DataFrame.

    Parameters
    ----------
    df : pd.DataFrame
        Sales transactions (sales_df — no returns).
    ref_date : pd.Timestamp, optional
        Reference date for recency. Defaults to max(date) + 1 day.
    weights : dict, optional
        Keys 'R', 'F', 'M'. Defaults to RFM_WEIGHTS from config.

    Returns
    -------
    pd.DataFrame
        Columns: CustomerID, Recency, Frequency, Monetary,
                 R_Score, F_Score, M_Score, RFM_Score, Segment
    """
    if df.empty:
        raise ValueError("Sales DataFrame is empty — cannot build RFM table.")

    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])

    if ref_date is None:
        ref_date = df[date_col].max() + pd.Timedelta(days=1)

    if weights is None:
        weights = RFM_WEIGHTS

    recency = calculate_recency(df, customer_col, date_col, ref_date)
    frequency = calculate_frequency(df, customer_col, invoice_col)
    monetary = calculate_monetary(df, customer_col, revenue_col)

    rfm = (
        recency
        .merge(frequency, on=customer_col)
        .merge(monetary, on=customer_col)
    )

    rfm = calculate_rfm_percentiles(rfm)
    rfm = calculate_rfm_score(rfm, weights)
    rfm = assign_segment(rfm)

    return rfm
