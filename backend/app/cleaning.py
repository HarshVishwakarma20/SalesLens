"""
File ingestion, type detection, and data cleaning.

Two file types are supported:
  - raw    : UCI Online Retail-style file (8 required columns)
  - cleaned: pre-cleaned file with CustomerID, InvoiceNo, InvoiceDate,
             StockCode, and NetRevenue or LineValue

Detection is based on column names, not on a user flag or file extension.
Cleaning logic mirrors notebook cell 1.
"""
from __future__ import annotations

import io
from typing import Any

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Column sets used for detection
# ---------------------------------------------------------------------------

RAW_REQUIRED_COLS: set[str] = {
    "InvoiceNo",
    "StockCode",
    "Description",
    "Quantity",
    "InvoiceDate",
    "UnitPrice",
    "CustomerID",
    "Country",
}

CLEANED_REQUIRED_COLS: set[str] = {
    "CustomerID",
    "InvoiceNo",
    "InvoiceDate",
    "StockCode",
}

# Known non-product / adjustment codes in the UCI Online Retail dataset
NON_PRODUCT_CODES: set[str] = {
    "POST",         # Postage
    "DOT",          # Dotcom postage
    "M",            # Manual transaction
    "S",            # Sample
    "AMAZONFEE",    # Amazon fee
    "BANK CHARGES",
    "C2",           # Carriage
    "D",            # Discount
    "CRUK",         # Charity / non-product
}

FINAL_COLUMNS: list[str] = [
    "InvoiceNo",
    "StockCode",
    "Description",
    "Quantity",
    "InvoiceDate",
    "Date",
    "Month",
    "Year",
    "UnitPrice",
    "CustomerID",
    "Country",
    "TransactionType",
    "TransactionValue",
    "SalesValue",
    "ReturnValue",
    "NetRevenue",
]


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def read_upload(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Parse a CSV or Excel upload into a DataFrame."""
    name = filename.lower()
    if name.endswith(".csv"):
        return pd.read_csv(io.BytesIO(file_bytes))
    if name.endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(file_bytes))
    raise ValueError(
        f"Unsupported file type '{filename}'. "
        "Only CSV (.csv) and Excel (.xlsx) files are accepted."
    )


def detect_file_type(df: pd.DataFrame) -> str:
    """
    Return 'raw', 'cleaned', or 'unknown' based on the column set.

    Detection order:
      1. If all 8 RAW_REQUIRED_COLS are present → 'raw'
      2. If CLEANED_REQUIRED_COLS + a revenue column are present → 'cleaned'
      3. Otherwise → 'unknown'
    """
    cols = set(df.columns.str.strip())
    if RAW_REQUIRED_COLS.issubset(cols):
        return "raw"
    if CLEANED_REQUIRED_COLS.issubset(cols) and (
        "NetRevenue" in cols or "LineValue" in cols
    ):
        return "cleaned"
    return "unknown"


def clean_raw_data(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    Apply full UCI Online Retail cleaning pipeline (notebook cell 1).
    Returns (cleaned_df, summary_dict).
    """
    summary: dict[str, Any] = {}
    summary["originalRows"] = len(df)

    # --- Standardise column names ---
    df = df.copy()
    df.columns = df.columns.str.strip()

    missing_cols = [c for c in RAW_REQUIRED_COLS if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")

    # --- Remove exact duplicates ---
    rows_before = len(df)
    df = df.drop_duplicates().copy()
    summary["duplicatesRemoved"] = rows_before - len(df)

    # --- Standardise data types ---
    df["InvoiceNo"] = df["InvoiceNo"].astype(str).str.strip()
    df["StockCode"] = df["StockCode"].astype(str).str.strip()
    df["Description"] = df["Description"].astype("string").str.strip()
    df["Country"] = df["Country"].astype("string").str.strip()
    df["Quantity"] = pd.to_numeric(df["Quantity"], errors="coerce")
    df["UnitPrice"] = pd.to_numeric(df["UnitPrice"], errors="coerce")
    df["CustomerID"] = pd.to_numeric(df["CustomerID"], errors="coerce")
    df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"], errors="coerce")

    # --- Remove rows with missing CustomerID ---
    missing_cid = int(df["CustomerID"].isna().sum())
    summary["missingCustomerIdRemoved"] = missing_cid
    df = df.dropna(subset=["CustomerID"]).copy()

    # --- Remove rows missing essential transaction fields ---
    essential = ["InvoiceNo", "StockCode", "Quantity", "UnitPrice", "InvoiceDate"]
    missing_essential = int(df[essential].isna().any(axis=1).sum())
    summary["missingEssentialRemoved"] = missing_essential
    df = df.dropna(subset=essential).copy()

    # Fill non-essential fields
    df["Description"] = df["Description"].fillna("Unknown")
    df["Country"] = df["Country"].fillna("Unknown")

    # --- Remove zero quantities ---
    zero_qty = int((df["Quantity"] == 0).sum())
    summary["zeroQuantityRemoved"] = zero_qty
    df = df[df["Quantity"] != 0].copy()

    # --- Remove negative prices ---
    neg_price = int((df["UnitPrice"] < 0).sum())
    summary["negativePriceRemoved"] = neg_price
    df = df[df["UnitPrice"] >= 0].copy()

    # --- Remove non-product / adjustment records ---
    non_product_mask = df["StockCode"].str.upper().isin(NON_PRODUCT_CODES)
    summary["nonProductRemoved"] = int(non_product_mask.sum())
    df = df[~non_product_mask].copy()

    # --- Classify sales vs returns ---
    df["TransactionType"] = np.where(
        df["InvoiceNo"].str.upper().str.startswith("C") | (df["Quantity"] < 0),
        "RETURN/CANCELLATION",
        "SALE",
    )

    # --- Calculate values ---
    df["TransactionValue"] = df["Quantity"] * df["UnitPrice"]
    df["SalesValue"] = np.where(
        df["TransactionType"] == "SALE", df["TransactionValue"], 0.0
    )
    df["ReturnValue"] = np.where(
        df["TransactionType"] == "RETURN/CANCELLATION",
        df["TransactionValue"].abs(),
        0.0,
    )

    # --- Date helper columns ---
    df["Date"] = df["InvoiceDate"].dt.date
    df["Month"] = df["InvoiceDate"].dt.to_period("M").astype(str)
    df["Year"] = df["InvoiceDate"].dt.year

    # --- Net revenue per line ---
    df["NetRevenue"] = df["SalesValue"] - df["ReturnValue"]

    # --- Format CustomerID as nullable Int64 ---
    df["CustomerID"] = df["CustomerID"].astype("Int64")

    cleaned_df = df[FINAL_COLUMNS].copy()

    # --- Summary stats ---
    summary["finalRows"] = len(cleaned_df)
    summary["salesRows"] = int((cleaned_df["TransactionType"] == "SALE").sum())
    summary["returnRows"] = int(
        (cleaned_df["TransactionType"] == "RETURN/CANCELLATION").sum()
    )
    summary["grossSales"] = round(float(cleaned_df["SalesValue"].sum()), 2)
    summary["returnValue"] = round(float(cleaned_df["ReturnValue"].sum()), 2)
    summary["netRevenue"] = round(float(cleaned_df["NetRevenue"].sum()), 2)

    return cleaned_df, summary


def prepare_cleaned_data(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    Prepare a pre-cleaned file for analytics without re-running raw cleaning.
    Normalises column names and adds any missing helper columns.
    """
    summary: dict[str, Any] = {"originalRows": len(df), "fileType": "pre-cleaned"}

    df = df.copy()
    df.columns = df.columns.str.strip()

    # Accept LineValue as an alias for NetRevenue
    if "NetRevenue" not in df.columns and "LineValue" in df.columns:
        df["NetRevenue"] = df["LineValue"]

    missing = [c for c in CLEANED_REQUIRED_COLS if c not in df.columns]
    if missing or "NetRevenue" not in df.columns:
        raise ValueError(
            f"Missing required columns in cleaned file: "
            f"{missing + (['NetRevenue or LineValue'] if 'NetRevenue' not in df.columns else [])}"
        )

    # Standardise types
    df["CustomerID"] = pd.to_numeric(df["CustomerID"], errors="coerce")
    df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"], errors="coerce")
    df["NetRevenue"] = pd.to_numeric(df["NetRevenue"], errors="coerce")
    df = df.dropna(subset=["CustomerID", "InvoiceDate", "NetRevenue"]).copy()
    df["CustomerID"] = df["CustomerID"].astype("Int64")

    # Add helper columns if missing
    if "Month" not in df.columns:
        df["Month"] = df["InvoiceDate"].dt.to_period("M").astype(str)
    if "Year" not in df.columns:
        df["Year"] = df["InvoiceDate"].dt.year
    if "Date" not in df.columns:
        df["Date"] = df["InvoiceDate"].dt.date

    # Classify transaction type from NetRevenue sign
    if "TransactionType" not in df.columns:
        df["TransactionType"] = np.where(
            df["NetRevenue"] >= 0, "SALE", "RETURN/CANCELLATION"
        )

    if "SalesValue" not in df.columns:
        df["SalesValue"] = np.where(df["NetRevenue"] > 0, df["NetRevenue"], 0.0)
    if "ReturnValue" not in df.columns:
        df["ReturnValue"] = np.where(df["NetRevenue"] < 0, df["NetRevenue"].abs(), 0.0)

    # Fill optional columns with safe defaults
    for col, default in [
        ("Description", "Unknown"),
        ("Country", "Unknown"),
        ("UnitPrice", 0.0),
        ("Quantity", 1),
        ("TransactionValue", df["NetRevenue"]),
    ]:
        if col not in df.columns:
            df[col] = default

    summary["finalRows"] = len(df)
    summary["salesRows"] = int((df["TransactionType"] == "SALE").sum())
    summary["returnRows"] = int(
        (df["TransactionType"] == "RETURN/CANCELLATION").sum()
    )

    return df, summary


def split_sales_returns(
    cleaned_df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split cleaned_df into sales_df and returns_df.

    Analytics functions expect a ``LineValue`` column that is always positive:
      - sales_df.LineValue  = SalesValue  (positive sale amounts)
      - returns_df.LineValue = ReturnValue (positive return amounts)
    """
    sales = cleaned_df[cleaned_df["TransactionType"] == "SALE"].copy()
    sales["LineValue"] = sales["SalesValue"]

    returns = cleaned_df[cleaned_df["TransactionType"] == "RETURN/CANCELLATION"].copy()
    returns["LineValue"] = returns["ReturnValue"]

    return sales, returns
