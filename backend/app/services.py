"""
Service layer — orchestrates the full upload-to-analytics pipeline.

Route handlers call functions here; no business logic lives in routes.py.

Processing model (mirrors notebook cell 28):
  - upload returns immediately with status='processing'
  - a background thread runs the full analytics pipeline
  - state.status is updated to 'ready' or 'failed' when done
"""
from __future__ import annotations

import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

from app import state as _state_module
from app.analytics.anomalies import anomaly_detection
from app.analytics.cohorts import cohort_retention
from app.analytics.journey import build_customer_journey
from app.analytics.kpis import (
    compute_daily_sales,
    compute_headline_kpis,
    compute_monthly_trends,
    generate_insights,
)
from app.analytics.products import product_contribution
from app.analytics.returns import returns_intelligence
from app.analytics.rfm import build_rfm_table
from app.analytics.risk import customer_risk_score
from app.cleaning import (
    clean_raw_data,
    detect_file_type,
    prepare_cleaned_data,
    read_upload,
    split_sales_returns,
)
from app.config import STORAGE_DIR

# One background worker — matches notebook cell 28 pattern (no Celery needed)
_executor = ThreadPoolExecutor(max_workers=1)

# Module-level alias for the shared state singleton
_s = _state_module.state


# ---------------------------------------------------------------------------
# Internal pipeline (runs in background thread)
# ---------------------------------------------------------------------------

def _is_current(generation: int) -> bool:
    """True only if this pipeline still owns the in-memory dataset."""
    return _s.generation == generation


def _run_pipeline(
    sales_df: pd.DataFrame,
    returns_df: pd.DataFrame,
    generation: int,
) -> None:
    """
    Execute all analytics in sequence.  Called inside a background thread.
    Updates state as each stage completes.
    """
    try:
        if not _is_current(generation):
            return

        # 1. Customer journey
        journey_df = build_customer_journey(sales_df)
        if not _is_current(generation):
            return
        _s.journey_df = journey_df

        # 2. RFM
        ref_date = sales_df["InvoiceDate"].max() + pd.Timedelta(days=1)
        rfm_df = build_rfm_table(
            sales_df,
            customer_col="CustomerID",
            invoice_col="InvoiceNo",
            date_col="InvoiceDate",
            revenue_col="LineValue",
            ref_date=ref_date,
        )
        if not _is_current(generation):
            return
        _s.rfm_df = rfm_df

        # 3. Cohort retention
        cohort_df = cohort_retention(sales_df, journey_df)
        if not _is_current(generation):
            return
        _s.cohort_df = cohort_df

        # 4. Returns intelligence
        leakage_df, cust_return_rate, portfolio_avg = returns_intelligence(
            sales_df, returns_df, rfm_df
        )
        if not _is_current(generation):
            return
        _s.leakage_df = leakage_df
        _s.cust_return_rate = cust_return_rate

        # 5. Product contribution
        product_df = product_contribution(sales_df, returns_df)
        if not _is_current(generation):
            return
        _s.product_df = product_df

        # 6. Anomaly detection
        anomaly_df = anomaly_detection(sales_df)
        if not _is_current(generation):
            return
        _s.anomaly_df = anomaly_df

        # 7. Risk scores
        risk_df = customer_risk_score(
            rfm_df, cust_return_rate, journey_df, anomaly_df, sales_df
        )
        if not _is_current(generation):
            return
        _s.risk_df = risk_df

        # 8. Headline KPIs
        kpis = compute_headline_kpis(
            rfm_df, cohort_df, journey_df, sales_df, returns_df
        )
        if not _is_current(generation):
            return
        _s.kpis = kpis

        persist_name = _s.dataset_name or "uploaded_dataset"
        persist_type = "raw" if _s.is_raw_input else "cleaned"
        persist_summary = _s.cleaning_summary or {}

        # 9. Persist to PostgreSQL database (if connected)
        try:
            from app.db_service import persist_analytics_results
            monthly_trends = compute_monthly_trends(sales_df, returns_df)
            daily_sales = compute_daily_sales(sales_df)
            ds_id = persist_analytics_results(
                filename=persist_name,
                file_type=persist_type,
                cleaning_summary=persist_summary,
                kpis=kpis,
                monthly_trends=monthly_trends,
                daily_sales=daily_sales,
                journey_df=journey_df,
                rfm_df=rfm_df,
                cohort_df=cohort_df,
                leakage_df=leakage_df,
                product_df=product_df,
                anomaly_df=anomaly_df,
                risk_df=risk_df,
            )
            if _is_current(generation):
                _s.dataset_id = ds_id
        except Exception as db_exc:
            print(f"[SalesLens DB] Database persistence skipped or warning: {db_exc}")

        if _is_current(generation):
            _s.status = "ready"

    except Exception:  # noqa: BLE001
        if _is_current(generation):
            _s.status = "failed"
            _s.error = traceback.format_exc()
        traceback.print_exc()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def process_upload(file_bytes: bytes, filename: str) -> dict[str, Any]:
    """
    Validate, clean, save, and kick off background analytics for an upload.

    Returns a dict with fileType and cleaningSummary for the upload response.
    Raises ValueError with a user-friendly message on validation failures.
    """
    # Reset any previous run and invalidate in-flight pipelines
    _s.reset()
    _s.generation += 1
    generation = _s.generation
    _s.status = "processing"
    _s.dataset_name = filename

    # Parse the file
    raw_df = read_upload(file_bytes, filename)

    # Detect type
    file_type = detect_file_type(raw_df)
    if file_type == "unknown":
        _s.status = "failed"
        _s.error = (
            "Could not detect file type from column names. "
            "Raw files need: InvoiceNo, StockCode, Description, Quantity, "
            "InvoiceDate, UnitPrice, CustomerID, Country. "
            "Cleaned files need: CustomerID, InvoiceNo, InvoiceDate, StockCode, "
            "and NetRevenue or LineValue."
        )
        raise ValueError(_s.error)

    _s.is_raw_input = file_type == "raw"

    # Save the uploaded file
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = Path(filename).name  # strip any path
    upload_path = STORAGE_DIR / f"{ts}_{safe_name}"
    upload_path.write_bytes(file_bytes)

    # Clean / prepare
    if file_type == "raw":
        cleaned_df, cleaning_summary = clean_raw_data(raw_df)
        # Persist the cleaned file as Excel
        cleaned_name = f"{ts}_cleaned_{Path(filename).stem}.xlsx"
        cleaned_path = STORAGE_DIR / cleaned_name
        cleaned_df.to_excel(cleaned_path, index=False)
        _s.cleaned_file_path = str(cleaned_path)
    else:
        cleaned_df, cleaning_summary = prepare_cleaned_data(raw_df)

    sales_df, returns_df = split_sales_returns(cleaned_df)

    _s.cleaned_df = cleaned_df
    _s.sales_df = sales_df
    _s.returns_df = returns_df
    _s.cleaning_summary = cleaning_summary

    # Fire-and-forget background pipeline (generation guards stale writes)
    _executor.submit(_run_pipeline, sales_df, returns_df, generation)

    return {"fileType": file_type, "cleaningSummary": cleaning_summary}


def require_ready() -> None:
    """
    Raise a RuntimeError if the dataset is not in 'ready' state.
    Routes call this before accessing analytics results.
    """
    if _s.status == "processing":
        raise RuntimeError("Dataset is still being processed. Try again shortly.")
    if _s.status == "failed":
        raise RuntimeError(f"Processing failed: {_s.error}")
    if _s.status != "ready":
        raise RuntimeError(
            "No dataset has been uploaded yet. "
            "POST a file to /api/v1/datasets/upload first."
        )


def get_overview() -> dict[str, Any]:
    """Assemble the overview response from already-computed state."""
    require_ready()
    return {
        "kpis": _s.kpis,
        "monthlyTrends": compute_monthly_trends(_s.sales_df, _s.returns_df),
        "dailySales": compute_daily_sales(_s.sales_df),
        "segmentDistribution": _segment_distribution(),
        "highRiskCustomers": _top_risk_customers(10),
        "insights": generate_insights(_s.kpis, _s.rfm_df, _s.leakage_df),
    }


def _segment_distribution() -> list[dict]:
    counts = _s.rfm_df["Segment"].value_counts()
    total = len(_s.rfm_df)
    return [
        {
            "segment": seg,
            "count": int(cnt),
            "pct": round(cnt / total * 100, 2),
        }
        for seg, cnt in counts.items()
    ]


def _top_risk_customers(n: int) -> list[dict]:
    risk = _s.risk_df.head(n)
    rfm = _s.rfm_df.set_index("CustomerID")
    rows = []
    for _, row in risk.iterrows():
        cid = int(row["CustomerID"])
        seg = rfm.loc[cid, "Segment"] if cid in rfm.index else "Unknown"
        rows.append(
            {
                "customerId": cid,
                "riskScore": float(row["RiskScore"]),
                "riskBand": str(row["RiskBand"]),
                "mainReason": str(row["MainReason"]),
                "segment": seg,
            }
        )
    return rows


def get_customer_detail(customer_id: int) -> dict[str, Any]:
    """Return a Customer 360 view for a single customer."""
    require_ready()

    # Journey
    j = _s.journey_df[_s.journey_df["CustomerID"] == customer_id]
    if j.empty:
        raise KeyError(f"Customer {customer_id} not found in the dataset.")
    jrow = j.iloc[0].to_dict()
    for k in ("FirstPurchaseDate", "LastPurchaseDate"):
        if pd.notna(jrow.get(k)):
            jrow[k] = str(jrow[k])[:10]  # ISO date

    # RFM
    rfm = _s.rfm_df[_s.rfm_df["CustomerID"] == customer_id]
    rfm_data = rfm.iloc[0].to_dict() if not rfm.empty else {}

    # Risk
    risk = _s.risk_df[_s.risk_df["CustomerID"] == customer_id]
    risk_data = risk.iloc[0].to_dict() if not risk.empty else {}

    # Return rate
    rr = float(_s.cust_return_rate.get(customer_id, 0.0))

    # Purchase timeline (last 20 invoices)
    timeline = (
        _s.sales_df[_s.sales_df["CustomerID"] == customer_id]
        .groupby("InvoiceNo")
        .agg(date=("InvoiceDate", "min"), value=("LineValue", "sum"))
        .sort_values("date", ascending=False)
        .head(20)
        .reset_index()
    )
    timeline["date"] = timeline["date"].dt.strftime("%Y-%m-%d")
    timeline_list = timeline.to_dict(orient="records")

    return {
        "customerId": customer_id,
        "journey": jrow,
        "rfm": {k: (None if isinstance(v, float) and (v != v) else v)
                for k, v in rfm_data.items()},
        "risk": {k: (None if isinstance(v, float) and (v != v) else v)
                 for k, v in risk_data.items()},
        "returnRate": round(rr, 4),
        "purchaseTimeline": timeline_list,
    }
