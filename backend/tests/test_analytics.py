"""
Unit tests for analytics modules.

Covers: RFM scoring, segmentation, customer journey, returns intelligence.
All tests use the minimal fixture DataFrames from conftest.py.
"""
from __future__ import annotations

import pandas as pd
import pytest

from app.analytics.journey import build_customer_journey
from app.analytics.rfm import (
    assign_segment,
    build_rfm_table,
    calculate_rfm_percentiles,
)
from app.analytics.returns import returns_intelligence
from app.cleaning import clean_raw_data, split_sales_returns


# ---------------------------------------------------------------------------
# Helpers to get sales / returns from the raw fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def sales_and_returns(raw_df: pd.DataFrame):
    cleaned, _ = clean_raw_data(raw_df)
    return split_sales_returns(cleaned)


@pytest.fixture
def sales_df(sales_and_returns):
    return sales_and_returns[0]


@pytest.fixture
def returns_df(sales_and_returns):
    return sales_and_returns[1]


# ---------------------------------------------------------------------------
# Customer journey
# ---------------------------------------------------------------------------

class TestCustomerJourney:
    def test_one_row_per_customer(self, sales_df: pd.DataFrame):
        journey = build_customer_journey(sales_df)
        assert len(journey) == journey["CustomerID"].nunique()

    def test_order_count_positive(self, sales_df: pd.DataFrame):
        journey = build_customer_journey(sales_df)
        assert (journey["OrderCount"] >= 1).all()

    def test_first_before_last(self, sales_df: pd.DataFrame):
        journey = build_customer_journey(sales_df)
        multi = journey[journey["OrderCount"] > 1]
        if not multi.empty:
            assert (multi["FirstPurchaseDate"] <= multi["LastPurchaseDate"]).all()

    def test_avg_gap_none_for_single_order(self, sales_df: pd.DataFrame):
        journey = build_customer_journey(sales_df)
        single = journey[journey["OrderCount"] == 1]
        if not single.empty:
            assert single["AvgGap"].isna().all()


# ---------------------------------------------------------------------------
# RFM scoring
# ---------------------------------------------------------------------------

class TestRFMScoring:
    def test_scores_in_range(self, sales_df: pd.DataFrame):
        rfm = build_rfm_table(sales_df)
        for col in ("R_Score", "F_Score", "M_Score"):
            assert rfm[col].between(1, 5).all(), f"{col} out of 1-5 range"

    def test_rfm_score_bounds(self, sales_df: pd.DataFrame):
        rfm = build_rfm_table(sales_df)
        # Minimum possible weighted score: 1*0.4 + 1*0.3 + 1*0.3 = 1.0
        # Maximum: 5*0.4 + 5*0.3 + 5*0.3 = 5.0
        assert rfm["RFM_Score"].between(1.0, 5.0).all()

    def test_one_row_per_customer(self, sales_df: pd.DataFrame):
        rfm = build_rfm_table(sales_df)
        assert len(rfm) == rfm["CustomerID"].nunique()

    def test_segments_are_valid(self, sales_df: pd.DataFrame):
        rfm = build_rfm_table(sales_df)
        valid = {"Champion", "Loyal", "New", "At-Risk", "Lost", "Promising"}
        assert set(rfm["Segment"].unique()).issubset(valid)


class TestSegmentRules:
    def _make_rfm(self, r, f, m):
        return pd.DataFrame(
            {"CustomerID": [1], "Recency": [1], "Frequency": [1], "Monetary": [1],
             "R_Score": [r], "F_Score": [f], "M_Score": [m], "RFM_Score": [0.0]}
        )

    def test_champion(self):
        rfm = assign_segment(self._make_rfm(5, 5, 5))
        assert rfm["Segment"].iloc[0] == "Champion"

    def test_loyal(self):
        # R>=3, F>=4 but not all >=4 (M=2 so not Champion)
        rfm = assign_segment(self._make_rfm(3, 4, 2))
        assert rfm["Segment"].iloc[0] == "Loyal"

    def test_new(self):
        # R>=4, F<=2
        rfm = assign_segment(self._make_rfm(5, 1, 3))
        assert rfm["Segment"].iloc[0] == "New"

    def test_at_risk(self):
        # R<=2, F>=3
        rfm = assign_segment(self._make_rfm(1, 4, 3))
        assert rfm["Segment"].iloc[0] == "At-Risk"

    def test_lost(self):
        # R<=2, F<=2
        rfm = assign_segment(self._make_rfm(1, 1, 1))
        assert rfm["Segment"].iloc[0] == "Lost"

    def test_promising(self):
        # Doesn't match any explicit rule
        rfm = assign_segment(self._make_rfm(3, 3, 3))
        assert rfm["Segment"].iloc[0] == "Promising"


# ---------------------------------------------------------------------------
# Returns intelligence
# ---------------------------------------------------------------------------

class TestReturnsIntelligence:
    def test_returns_three_values(self, sales_df, returns_df, raw_df):
        rfm = build_rfm_table(sales_df)
        leakage, cust_rr, portfolio_avg = returns_intelligence(
            sales_df, returns_df, rfm
        )
        assert isinstance(leakage, pd.DataFrame)
        assert isinstance(portfolio_avg, float)

    def test_key_types_present(self, sales_df, returns_df, raw_df):
        rfm = build_rfm_table(sales_df)
        leakage, _, _ = returns_intelligence(sales_df, returns_df, rfm)
        types = set(leakage["KeyType"].unique())
        assert {"SKU", "Segment", "Month"}.issubset(types)

    def test_return_rate_between_zero_and_one(self, sales_df, returns_df):
        rfm = build_rfm_table(sales_df)
        leakage, cust_rr, _ = returns_intelligence(sales_df, returns_df, rfm)
        assert leakage["ReturnRate"].between(0, 1).all()

    def test_empty_returns_no_crash(self, sales_df):
        rfm = build_rfm_table(sales_df)
        empty_returns = pd.DataFrame(
            columns=["CustomerID", "InvoiceDate", "LineValue", "StockCode"]
        )
        leakage, cust_rr, avg = returns_intelligence(sales_df, empty_returns, rfm)
        assert avg == 0.0
        assert leakage.empty
