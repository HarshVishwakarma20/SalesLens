"""
Cohort retention analysis — notebook cell 11.

Customers are grouped by their first-purchase month (cohort).
For each (cohort, month-index) pair we track:
  - ActiveCustomers : unique customers who purchased that month
  - Revenue         : total revenue that month
  - CohortSize      : size of the cohort at month 0
  - RetentionPct    : ActiveCustomers / CohortSize * 100
  - RevenuePct      : Revenue / cohort's month-0 revenue * 100
"""
from __future__ import annotations

import pandas as pd


def cohort_retention(
    sales_df: pd.DataFrame,
    journey_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Build the cohort retention table.

    Parameters
    ----------
    sales_df : pd.DataFrame
        Sales transactions with CustomerID, InvoiceDate, LineValue.
    journey_df : pd.DataFrame
        Output of build_customer_journey; must have CustomerID and
        FirstPurchaseDate.

    Returns
    -------
    pd.DataFrame
        Columns: CohortMonth (str), MonthIndex (int), ActiveCustomers,
        Revenue, CalendarMonth (str), CohortSize, RetentionPct, RevenuePct
    """
    if sales_df.empty or journey_df.empty:
        return pd.DataFrame()

    s = sales_df[["CustomerID", "InvoiceDate", "LineValue"]].copy()

    # Map each customer to their cohort (first-purchase month)
    first = journey_df.set_index("CustomerID")["FirstPurchaseDate"]
    s["CohortMonth"] = s["CustomerID"].map(first).dt.to_period("M")
    s["Month"] = s["InvoiceDate"].dt.to_period("M")

    # Months elapsed since cohort start (vectorised)
    s["MonthIndex"] = (
        (s["Month"].dt.year - s["CohortMonth"].dt.year) * 12
        + (s["Month"].dt.month - s["CohortMonth"].dt.month)
    )

    cells = (
        s.groupby(["CohortMonth", "MonthIndex"])
        .agg(
            ActiveCustomers=("CustomerID", "nunique"),
            Revenue=("LineValue", "sum"),
            CalendarMonth=("Month", "first"),
        )
        .reset_index()
    )

    # Month-0 row for each cohort = baseline
    base = cells[cells["MonthIndex"] == 0].set_index("CohortMonth")
    cells["CohortSize"] = cells["CohortMonth"].map(base["ActiveCustomers"])
    cells["RetentionPct"] = (
        cells["ActiveCustomers"] / cells["CohortSize"] * 100
    ).round(2)
    cells["RevenuePct"] = (
        cells["Revenue"] / cells["CohortMonth"].map(base["Revenue"]) * 100
    ).round(2)

    # Convert Period objects to strings for JSON serialisation
    cells["CohortMonth"] = cells["CohortMonth"].astype(str)
    cells["CalendarMonth"] = cells["CalendarMonth"].astype(str)

    return cells.reset_index(drop=True)
