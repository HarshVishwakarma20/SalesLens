"""
Tests for the cleaning module.

Covers:
  - detect_file_type for raw, cleaned, and unknown DataFrames
  - clean_raw_data: all cleaning steps from notebook cell 1
  - prepare_cleaned_data: normalising a pre-cleaned file
  - split_sales_returns: correct LineValue aliases
  - Missing-column error messages
"""
from __future__ import annotations

import pandas as pd
import pytest

from app.cleaning import (
    clean_raw_data,
    detect_file_type,
    prepare_cleaned_data,
    split_sales_returns,
)


# ---------------------------------------------------------------------------
# detect_file_type
# ---------------------------------------------------------------------------

class TestDetectFileType:
    def test_raw_file(self, raw_df: pd.DataFrame):
        assert detect_file_type(raw_df) == "raw"

    def test_cleaned_file(self, cleaned_df: pd.DataFrame):
        assert detect_file_type(cleaned_df) == "cleaned"

    def test_unknown_file(self):
        df = pd.DataFrame({"col_a": [1], "col_b": [2]})
        assert detect_file_type(df) == "unknown"


# ---------------------------------------------------------------------------
# clean_raw_data
# ---------------------------------------------------------------------------

class TestCleanRawData:
    def test_removes_duplicates(self, raw_df: pd.DataFrame):
        cleaned, summary = clean_raw_data(raw_df)
        assert summary["duplicatesRemoved"] >= 1

    def test_removes_missing_customer_id(self, raw_df: pd.DataFrame):
        cleaned, summary = clean_raw_data(raw_df)
        assert summary["missingCustomerIdRemoved"] >= 1
        assert cleaned["CustomerID"].isna().sum() == 0

    def test_removes_zero_quantity(self, raw_df: pd.DataFrame):
        cleaned, summary = clean_raw_data(raw_df)
        assert summary["zeroQuantityRemoved"] >= 1
        assert (cleaned["Quantity"] == 0).sum() == 0

    def test_removes_non_product_codes(self, raw_df: pd.DataFrame):
        cleaned, summary = clean_raw_data(raw_df)
        assert summary["nonProductRemoved"] >= 1
        assert "POST" not in cleaned["StockCode"].values

    def test_classifies_returns(self, raw_df: pd.DataFrame):
        cleaned, _ = clean_raw_data(raw_df)
        return_rows = cleaned[cleaned["TransactionType"] == "RETURN/CANCELLATION"]
        assert len(return_rows) >= 1
        # Return values are stored as positives
        assert (return_rows["ReturnValue"] >= 0).all()

    def test_net_revenue_column_exists(self, raw_df: pd.DataFrame):
        cleaned, _ = clean_raw_data(raw_df)
        assert "NetRevenue" in cleaned.columns

    def test_summary_keys(self, raw_df: pd.DataFrame):
        _, summary = clean_raw_data(raw_df)
        for key in (
            "originalRows",
            "duplicatesRemoved",
            "missingCustomerIdRemoved",
            "finalRows",
            "grossSales",
            "netRevenue",
        ):
            assert key in summary, f"Missing summary key: {key}"

    def test_missing_required_column_raises(self):
        df = pd.DataFrame({"InvoiceNo": ["1"], "Quantity": [1]})
        with pytest.raises(ValueError, match="Missing required columns"):
            clean_raw_data(df)


# ---------------------------------------------------------------------------
# prepare_cleaned_data
# ---------------------------------------------------------------------------

class TestPrepareCleanedData:
    def test_accepts_net_revenue_column(self, cleaned_df: pd.DataFrame):
        result, summary = prepare_cleaned_data(cleaned_df)
        assert "NetRevenue" in result.columns
        assert summary["finalRows"] > 0

    def test_accepts_line_value_alias(self):
        df = pd.DataFrame(
            {
                "CustomerID": [100],
                "InvoiceNo": ["INV001"],
                "InvoiceDate": ["2021-01-01"],
                "StockCode": ["ABC"],
                "LineValue": [10.0],
            }
        )
        result, _ = prepare_cleaned_data(df)
        assert "NetRevenue" in result.columns

    def test_adds_month_and_year(self, cleaned_df: pd.DataFrame):
        result, _ = prepare_cleaned_data(cleaned_df)
        assert "Month" in result.columns
        assert "Year" in result.columns

    def test_missing_columns_raises(self):
        df = pd.DataFrame({"CustomerID": [1], "InvoiceNo": ["X"]})
        with pytest.raises(ValueError, match="Missing required columns"):
            prepare_cleaned_data(df)


# ---------------------------------------------------------------------------
# split_sales_returns
# ---------------------------------------------------------------------------

class TestSplitSalesReturns:
    def test_sales_line_value_positive(self, raw_df: pd.DataFrame):
        cleaned, _ = clean_raw_data(raw_df)
        sales, returns = split_sales_returns(cleaned)
        assert (sales["LineValue"] >= 0).all()

    def test_returns_line_value_positive(self, raw_df: pd.DataFrame):
        cleaned, _ = clean_raw_data(raw_df)
        sales, returns = split_sales_returns(cleaned)
        if not returns.empty:
            assert (returns["LineValue"] >= 0).all()

    def test_no_overlap(self, raw_df: pd.DataFrame):
        cleaned, _ = clean_raw_data(raw_df)
        sales, returns = split_sales_returns(cleaned)
        common = set(sales.index) & set(returns.index)
        assert len(common) == 0
