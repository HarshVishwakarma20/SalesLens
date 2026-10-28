"""
Shared pytest fixtures for Acuity backend tests.

Two minimal DataFrames are created here:
  raw_df    — mimics a UCI Online Retail file (all 8 required columns)
  cleaned_df — mimics a pre-cleaned file (CustomerID, InvoiceNo, InvoiceDate,
               StockCode, NetRevenue)

Both are small but exercise all cleaning and analytics code paths.
"""
from __future__ import annotations

import io
from datetime import datetime, timedelta

import pandas as pd
import pytest


# ---------------------------------------------------------------------------
# Raw UCI-style data
# ---------------------------------------------------------------------------

def _make_raw_rows() -> list[dict]:
    base = datetime(2021, 1, 10)
    rows = []
    configs = [
        # (InvoiceNo, StockCode, CustomerID, Qty, Price, days_offset)
        ("536365", "85123A", 17850, 6, 2.55, 0),
        ("536365", "71053",  17850, 6, 3.39, 0),
        ("536366", "84406B", 17850, 8, 2.75, 5),
        ("536366", "84029G", 17850, 6, 3.39, 5),
        # Return — InvoiceNo starts with C
        ("C536367", "85123A", 17850, -2, 2.55, 10),
        # Different customer
        ("537001", "22423",  14688, 12, 1.65, 15),
        ("537002", "22423",  14688, 6,  1.65, 45),
        # Non-product code — should be removed
        ("537999", "POST",   14688, 1,  5.00, 50),
        # Missing CustomerID — should be removed
        ("538000", "22423",  None,  3,  1.65, 55),
        # Zero quantity — should be removed
        ("538001", "22423",  14688, 0,  1.65, 60),
        # Exact duplicate (duplicate of row index 0 — one will be removed)
        ("536365", "85123A", 17850, 6, 2.55, 0),
    ]
    for inv, sku, cid, qty, price, days in configs:
        rows.append(
            {
                "InvoiceNo": inv,
                "StockCode": sku,
                "Description": f"Product {sku}",
                "Quantity": qty,
                "InvoiceDate": base + timedelta(days=days),
                "UnitPrice": price,
                "CustomerID": cid,
                "Country": "United Kingdom",
            }
        )
    return rows


@pytest.fixture
def raw_df() -> pd.DataFrame:
    return pd.DataFrame(_make_raw_rows())


@pytest.fixture
def raw_csv_bytes(raw_df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    raw_df.to_csv(buf, index=False)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Pre-cleaned data
# ---------------------------------------------------------------------------

def _make_cleaned_rows() -> list[dict]:
    base = datetime(2021, 1, 10)
    rows = []
    configs = [
        ("536365", "85123A", 17850, 15.30, 0),
        ("536366", "84406B", 17850, 22.00, 5),
        ("537001", "22423",  14688, 19.80, 15),
        ("537002", "22423",  14688, 9.90,  45),
        ("537003", "22423",  14688, -5.00, 50),   # return
    ]
    for inv, sku, cid, net, days in configs:
        rows.append(
            {
                "CustomerID": cid,
                "InvoiceNo": inv,
                "InvoiceDate": base + timedelta(days=days),
                "StockCode": sku,
                "NetRevenue": net,
            }
        )
    return rows


@pytest.fixture
def cleaned_df() -> pd.DataFrame:
    return pd.DataFrame(_make_cleaned_rows())


@pytest.fixture
def cleaned_csv_bytes(cleaned_df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    cleaned_df.to_csv(buf, index=False)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# FastAPI test client
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)
