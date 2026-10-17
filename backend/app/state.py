"""
In-memory application state.

All DataFrames and computed results are held here while the server is running.
Restarting the server clears everything — see README for details.
"""
from __future__ import annotations

from typing import Optional
import pandas as pd


class _AppState:
    """Single shared state object — import the ``state`` singleton below."""

    # Processing status: idle | processing | ready | failed
    status: str = "idle"
    error: Optional[str] = None

    # Core DataFrames produced by cleaning
    cleaned_df: Optional[pd.DataFrame] = None
    sales_df: Optional[pd.DataFrame] = None
    returns_df: Optional[pd.DataFrame] = None

    # Analytics results
    journey_df: Optional[pd.DataFrame] = None
    rfm_df: Optional[pd.DataFrame] = None
    cohort_df: Optional[pd.DataFrame] = None
    leakage_df: Optional[pd.DataFrame] = None
    cust_return_rate: Optional[pd.Series] = None
    product_df: Optional[pd.DataFrame] = None
    anomaly_df: Optional[pd.DataFrame] = None
    risk_df: Optional[pd.DataFrame] = None
    kpis: Optional[dict] = None

    # File metadata
    cleaned_file_path: Optional[str] = None
    dataset_name: Optional[str] = None
    dataset_id: Optional[int] = None
    is_raw_input: bool = False
    cleaning_summary: Optional[dict] = None

    def reset(self) -> None:
        """Clear all state before processing a new upload."""
        self.status = "idle"
        self.error = None
        self.cleaned_df = None
        self.sales_df = None
        self.returns_df = None
        self.journey_df = None
        self.rfm_df = None
        self.cohort_df = None
        self.leakage_df = None
        self.cust_return_rate = None
        self.product_df = None
        self.anomaly_df = None
        self.risk_df = None
        self.kpis = None
        self.cleaned_file_path = None
        self.dataset_name = None
        self.dataset_id = None
        self.is_raw_input = False
        self.cleaning_summary = None

    def is_ready(self) -> bool:
        return self.status == "ready"


# Module-level singleton used throughout the application
state = _AppState()
