"""
Rule-based customer risk scoring — notebook cell 19.

Four components (each normalised 0–1):
  1. rfm_decay    : 1 - (RFM_Score - 1) / 4  (low RFM → high decay)
  2. return_rate  : personal return rate (capped at 1)
  3. gap_trend    : rate at which purchase gaps are widening
  4. anomaly      : 1 if customer ordered on any flagged anomaly day, else 0

Weighted sum → RiskScore (0–100).  Risk band thresholds:
  0–25 Low | 25–50 Medium | 50–75 High | 75–100 Critical

No machine learning is used.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.config import RISK_WEIGHTS


def build_risk_components(
    rfm_df: pd.DataFrame,
    cust_return_rate: pd.Series,
    journey_df: pd.DataFrame,
    anomaly_df: pd.DataFrame,
    sales_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Assemble the four risk component scores per customer.

    Returns a DataFrame with columns:
    CustomerID, rfm_decay, return_rate, gap_trend, anomaly
    """
    comp = journey_df[["CustomerID", "AvgGap", "GapTrend"]].merge(
        rfm_df[["CustomerID", "RFM_Score"]], on="CustomerID", how="inner"
    )

    # 1. RFM decay: low score → high decay (scaled 0..1)
    comp["rfm_decay"] = (1 - (comp["RFM_Score"] - 1) / 4).clip(0, 1)

    # 2. Personal return rate
    comp["return_rate"] = (
        comp["CustomerID"].map(cust_return_rate).fillna(0).clip(0, 1)
    )

    # 3. Gap trend relative to average gap
    avg_gap_safe = comp["AvgGap"].replace(0, np.nan)
    rel = comp["GapTrend"] / avg_gap_safe
    comp["gap_trend"] = rel.fillna(0).clip(0, 1)

    # 4. Anomaly activity — did the customer order on a flagged day?
    flagged_days: set = set(anomaly_df.loc[anomaly_df["Flagged"], "Date"])
    hit: set = set(
        sales_df.loc[
            sales_df["InvoiceDate"].dt.normalize().isin(flagged_days),
            "CustomerID",
        ]
    )
    comp["anomaly"] = comp["CustomerID"].isin(hit).astype(float)

    return comp[["CustomerID", "rfm_decay", "return_rate", "gap_trend", "anomaly"]]


def customer_risk_score(
    rfm_df: pd.DataFrame,
    cust_return_rate: pd.Series,
    journey_df: pd.DataFrame,
    anomaly_df: pd.DataFrame,
    sales_df: pd.DataFrame,
    weights: dict | None = None,
) -> pd.DataFrame:
    """
    Compute rule-based risk scores for all customers (notebook cell 19).

    Parameters
    ----------
    weights : dict, optional
        Keys: rfm_decay, return_rate, gap_trend, anomaly.
        Must be non-negative and sum to 1.0.
        Defaults to RISK_WEIGHTS from config.

    Returns
    -------
    pd.DataFrame
        Columns: CustomerID, rfm_decay, return_rate, gap_trend, anomaly,
                 RiskScore, RiskBand, MainReason
    """
    if weights is None:
        weights = RISK_WEIGHTS

    if abs(sum(weights.values()) - 1.0) > 1e-6:
        raise ValueError("Risk weights must sum to 1.0")
    if any(v < 0 for v in weights.values()):
        raise ValueError("All risk weights must be non-negative")

    comp = build_risk_components(
        rfm_df, cust_return_rate, journey_df, anomaly_df, sales_df
    )

    component_keys = ["rfm_decay", "return_rate", "gap_trend", "anomaly"]
    comp["RiskScore"] = round(
        100.0
        * sum(weights.get(k, 0.0) * comp[k] for k in component_keys),
        2,
    )

    # Risk band
    comp["RiskBand"] = pd.cut(
        comp["RiskScore"],
        bins=[0, 25, 50, 75, 100],
        labels=["Low", "Medium", "High", "Critical"],
        include_lowest=True,
    ).astype(str)

    # Main reason = highest weighted contribution
    weighted_contribs = comp[component_keys].multiply(
        [weights.get(k, 0.0) for k in component_keys]
    )
    comp["MainReason"] = weighted_contribs.idxmax(axis=1)

    return comp.sort_values("RiskScore", ascending=False).reset_index(drop=True)
