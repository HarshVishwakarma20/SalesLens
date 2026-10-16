"""
Sales anomaly detection — notebook cells 17 and 24.

Two modes:
  1. Rolling z-score (default) — uses a sliding window; no external dependencies.
  2. STL decomposition (optional, ?method=stl) — requires statsmodels.
     Accounts for weekly seasonality before flagging residuals.

Both return the same column schema so downstream code is unchanged.
"""
from __future__ import annotations

from collections import deque
from typing import Literal

import pandas as pd

from app.config import (
    ANOMALY_MIN_DAYS,
    ANOMALY_THRESHOLD,
    ANOMALY_WINDOW,
    STL_PERIOD,
)


# ---------------------------------------------------------------------------
# Shared helper
# ---------------------------------------------------------------------------

def _attach_affected(
    anomaly_df: pd.DataFrame,
    sales_df: pd.DataFrame,
) -> pd.DataFrame:
    """For each flagged day, record which CustomerIDs placed orders."""
    s = sales_df.assign(Date=sales_df["InvoiceDate"].dt.normalize())
    flagged_days = set(anomaly_df.loc[anomaly_df["Flagged"], "Date"])
    who = (
        s[s["Date"].isin(flagged_days)]
        .groupby("Date")["CustomerID"]
        .apply(lambda x: sorted(int(c) for c in x.unique()))
    )
    anomaly_df = anomaly_df.copy()
    anomaly_df["AffectedCustomerIDs"] = anomaly_df["Date"].map(who)
    anomaly_df["AffectedCustomerIDs"] = anomaly_df["AffectedCustomerIDs"].apply(
        lambda v: v if isinstance(v, list) else []
    )
    return anomaly_df


def _add_anomaly_type(df: pd.DataFrame) -> pd.DataFrame:
    """Add AnomalyType column: 'spike', 'drop', or None."""
    df = df.copy()
    df["AnomalyType"] = df.apply(
        lambda row: ("spike" if row["z_score"] > 0 else "drop")
        if row["Flagged"]
        else None,
        axis=1,
    )
    return df


# ---------------------------------------------------------------------------
# Rolling z-score (notebook cell 17)
# ---------------------------------------------------------------------------

def anomaly_detection(
    sales_df: pd.DataFrame,
    window: int = ANOMALY_WINDOW,
    threshold: float = ANOMALY_THRESHOLD,
    min_days: int = ANOMALY_MIN_DAYS,
) -> pd.DataFrame:
    """
    Detect unusual daily sales spikes and drops using a rolling z-score.

    Each day's z-score is computed against the rolling mean and std of the
    preceding *window* days.  Days with fewer than *min_days* of history
    receive a z-score of 0 (not judged).

    Parameters
    ----------
    sales_df : pd.DataFrame
        Sales transactions with InvoiceDate and LineValue.
    window : int
        Rolling window size (default 30 days).
    threshold : float
        |z| > threshold → flagged (default 2.0).
    min_days : int
        Minimum days of history before flagging starts (default 7).

    Returns
    -------
    pd.DataFrame
        Columns: Date, Sales, z_score, Flagged, AnomalyType,
                 AffectedCustomerIDs
    """
    if sales_df.empty:
        return pd.DataFrame(
            columns=[
                "Date", "Sales", "z_score", "Flagged",
                "AnomalyType", "AffectedCustomerIDs",
            ]
        )

    daily = (
        sales_df.assign(Date=sales_df["InvoiceDate"].dt.normalize())
        .groupby("Date")["LineValue"]
        .sum()
        .sort_index()
    )

    q: deque[float] = deque()
    run_sum = 0.0
    run_sumsq = 0.0
    out: list[dict] = []

    for day, val in daily.items():
        if len(q) == window:
            old = q.popleft()
            run_sum -= old
            run_sumsq -= old ** 2
        q.append(float(val))
        run_sum += float(val)
        run_sumsq += float(val) ** 2

        n = len(q)
        mean = run_sum / n
        variance = max(run_sumsq / n - mean ** 2, 0.0)
        std = variance ** 0.5
        z = (float(val) - mean) / std if (n >= min_days and std > 0) else 0.0
        out.append(
            {
                "Date": day,
                "Sales": float(val),
                "z_score": round(z, 4),
                "Flagged": bool(abs(z) > threshold),
            }
        )

    result = pd.DataFrame(out)
    result = _add_anomaly_type(result)
    return _attach_affected(result, sales_df)


# ---------------------------------------------------------------------------
# STL-based (notebook cell 24) — optional
# ---------------------------------------------------------------------------

def stl_anomaly_detection(
    sales_df: pd.DataFrame,
    period: int = STL_PERIOD,
    threshold: float = ANOMALY_THRESHOLD,
) -> pd.DataFrame:
    """
    Seasonality-aware anomaly detection via STL decomposition (notebook cell 24).

    Requires statsmodels.  Flags dates where |z(residual)| > threshold.

    Parameters
    ----------
    sales_df : pd.DataFrame
        Sales transactions with InvoiceDate and LineValue.
    period : int
        Seasonal period in days (default 7 = weekly).
    threshold : float
        z-score threshold (default 2.0).
    """
    try:
        from statsmodels.tsa.seasonal import STL  # type: ignore
    except ImportError as exc:
        raise ImportError(
            "statsmodels is required for STL anomaly detection. "
            "Install it with: pip install statsmodels"
        ) from exc

    if sales_df.empty:
        return pd.DataFrame(
            columns=[
                "Date", "Sales", "z_score", "Flagged",
                "AnomalyType", "AffectedCustomerIDs",
            ]
        )

    daily = (
        sales_df.assign(Date=sales_df["InvoiceDate"].dt.normalize())
        .groupby("Date")["LineValue"]
        .sum()
        .sort_index()
    )
    # STL needs a gap-free series; fill non-trading days with 0
    daily = daily.asfreq("D", fill_value=0)

    res = STL(daily, period=period, robust=True).fit()
    resid = res.resid
    std = resid.std()
    z = (resid - resid.mean()) / std if std > 0 else resid * 0

    result = pd.DataFrame(
        {
            "Date": daily.index,
            "Sales": daily.values.astype(float),
            "z_score": z.values.round(4),
            "Flagged": (z.abs() > threshold).values,
        }
    )
    result = _add_anomaly_type(result)
    return _attach_affected(result, sales_df)
