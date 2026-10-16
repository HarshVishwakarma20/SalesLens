"""
Headline KPIs and supporting metrics — notebook cell 21.

Functions:
  compute_headline_kpis   — nine top-level numbers
  compute_monthly_trends  — monthly sales, returns, net revenue
  compute_daily_sales     — daily sales totals
  generate_insights       — short human-readable insight sentences
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def compute_headline_kpis(
    rfm_df: pd.DataFrame,
    cohort_df: pd.DataFrame,
    journey_df: pd.DataFrame,
    sales_df: pd.DataFrame,
    returns_df: pd.DataFrame,
) -> dict:
    """
    Compute the nine headline KPIs (notebook cell 21).

    Returns
    -------
    dict with camelCase keys for JSON serialisation.
    """
    total_customers = int(len(rfm_df))
    active = int((rfm_df["Segment"] != "Lost").sum())
    repeat_rate = float((journey_df["OrderCount"] > 1).mean())

    # Indicative churn (last calendar month, non-month-0 cohorts only)
    churn: float | None = None
    if not cohort_df.empty:
        latest_month = cohort_df["CalendarMonth"].max()
        latest_ret = cohort_df[
            (cohort_df["CalendarMonth"] == latest_month)
            & (cohort_df["MonthIndex"] > 0)
        ]["RetentionPct"]
        if len(latest_ret) > 0:
            churn = float(1 - latest_ret.mean() / 100)

    # Revenue retention — mean across all cohort months > 0
    rev_ret: float | None = None
    if not cohort_df.empty:
        later = cohort_df[cohort_df["MonthIndex"] > 0]["RevenuePct"]
        if len(later) > 0:
            rev_ret = float(later.mean())

    gross_sales = float(sales_df["LineValue"].sum())
    return_value = float(returns_df["LineValue"].abs().sum()) if not returns_df.empty else 0.0
    net_rev = gross_sales - return_value
    denom = gross_sales + return_value
    overall_return_rate = float(return_value / denom) if denom > 0 else 0.0

    return {
        "totalCustomers": total_customers,
        "activeCustomers": active,
        "repeatRate": round(repeat_rate, 4),
        "churnRate": round(churn, 4) if churn is not None else None,
        "revenueRetentionPct": round(rev_ret, 2) if rev_ret is not None else None,
        "grossSales": round(gross_sales, 2),
        "returnsValue": round(return_value, 2),
        "netRevenue": round(net_rev, 2),
        "overallReturnRate": round(overall_return_rate, 4),
    }


def compute_monthly_trends(
    sales_df: pd.DataFrame,
    returns_df: pd.DataFrame,
) -> list[dict]:
    """Monthly sales, returns, and net revenue."""
    s = sales_df.groupby("Month")["LineValue"].sum().rename("sales")
    if not returns_df.empty:
        r = (
            returns_df.groupby("Month")["LineValue"]
            .apply(lambda x: x.abs().sum())
            .rename("returns")
        )
    else:
        r = pd.Series(dtype=float, name="returns")

    combined = pd.concat([s, r], axis=1).fillna(0).reset_index()
    combined.columns = ["month", "sales", "returns"]
    combined["netRevenue"] = (combined["sales"] - combined["returns"]).round(2)
    combined["sales"] = combined["sales"].round(2)
    combined["returns"] = combined["returns"].round(2)
    return combined.to_dict(orient="records")


def compute_daily_sales(sales_df: pd.DataFrame) -> list[dict]:
    """Daily sales totals (date as ISO string)."""
    if sales_df.empty:
        return []
    daily = (
        sales_df.assign(date=sales_df["InvoiceDate"].dt.normalize())
        .groupby("date")["LineValue"]
        .sum()
        .reset_index()
    )
    daily.columns = ["date", "sales"]
    daily["date"] = daily["date"].dt.strftime("%Y-%m-%d")
    daily["sales"] = daily["sales"].round(2)
    return daily.to_dict(orient="records")


def generate_insights(
    kpis: dict,
    rfm_df: pd.DataFrame,
    leakage_df: pd.DataFrame,
) -> list[str]:
    """
    Produce 4-5 short insight sentences from the computed results.
    Returned as a plain list of strings for the frontend to display.
    """
    insights: list[str] = []

    # Dominant segment
    seg_counts = rfm_df["Segment"].value_counts()
    top_seg = seg_counts.index[0]
    top_pct = seg_counts.iloc[0] / len(rfm_df) * 100
    insights.append(
        f"{top_pct:.1f}% of customers are classified as '{top_seg}', "
        f"the largest segment."
    )

    # Repeat purchase
    repeat_pct = kpis.get("repeatRate", 0) * 100
    insights.append(
        f"{repeat_pct:.1f}% of customers have made more than one purchase, "
        f"indicating {'strong' if repeat_pct > 50 else 'moderate'} loyalty."
    )

    # Churn
    if kpis.get("churnRate") is not None:
        churn_pct = kpis["churnRate"] * 100
        insights.append(
            f"Indicative monthly churn is {churn_pct:.1f}%. "
            + (
                "Consider re-engagement campaigns."
                if churn_pct > 50
                else "Retention looks healthy."
            )
        )

    # Return rate
    rr_pct = kpis.get("overallReturnRate", 0) * 100
    insights.append(
        f"The overall return rate is {rr_pct:.1f}% of total transaction value."
    )

    # Worst-returning segment
    if not leakage_df.empty:
        seg_leak = leakage_df[leakage_df["KeyType"] == "Segment"].sort_values(
            "ReturnRate", ascending=False
        )
        if len(seg_leak) > 0:
            worst = seg_leak.iloc[0]
            if worst["Flagged"]:
                insights.append(
                    f"The '{worst['Key']}' segment has the highest return rate "
                    f"({worst['ReturnRate'] * 100:.1f}%), above the portfolio average."
                )

    return insights
