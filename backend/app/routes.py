"""
All API route handlers.

Routes are thin: they validate inputs, call service / analytics functions,
and format responses.  Business logic stays in services.py and analytics/.

Prefix /api/v1 is applied in main.py.
"""
from __future__ import annotations

import io
from typing import Annotated, Literal

import pandas as pd
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from app import state as _state_module
from app.analytics.anomalies import anomaly_detection, stl_anomaly_detection
from app.analytics.risk import customer_risk_score
from app.config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.schemas import OkResponse, RiskWeightParams, StatusResponse, UploadResponse
from app.services import (
    get_customer_detail,
    get_overview,
    process_upload,
    require_ready,
)
from app.utils import paginate, sanitize

router = APIRouter()
_s = _state_module.state

# ---------------------------------------------------------------------------
# Supported export tables
# ---------------------------------------------------------------------------
EXPORT_TABLES: dict[str, str] = {
    "journey": "journey_df",
    "rfm": "rfm_df",
    "cohorts": "cohort_df",
    "returns": "leakage_df",
    "products": "product_df",
    "anomalies": "anomaly_df",
    "risk": "risk_df",
}


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _http_error(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail)


def _guard() -> None:
    """Raise 503 / 500 if the dataset is not ready."""
    try:
        require_ready()
    except RuntimeError as exc:
        code = 503 if "processing" in str(exc).lower() or "no dataset" in str(exc).lower() else 500
        raise _http_error(code, str(exc)) from exc


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@router.get("/health", tags=["Health"])
def health() -> dict:
    return {"status": "ok", "service": "SalesLens API"}


# ---------------------------------------------------------------------------
# Upload & Status
# ---------------------------------------------------------------------------

@router.post("/datasets/upload", response_model=UploadResponse, tags=["Dataset"])
async def upload_dataset(file: UploadFile = File(...)) -> UploadResponse:
    """
    Upload a raw UCI-style or pre-cleaned CSV/Excel file.
    Processing starts immediately in the background.
    Poll GET /datasets/status until status == 'ready'.
    """
    if file.filename is None:
        raise _http_error(400, "No filename provided.")

    content = await file.read()
    if len(content) == 0:
        raise _http_error(400, "Uploaded file is empty.")

    try:
        result = process_upload(content, file.filename)
    except ValueError as exc:
        raise _http_error(422, str(exc)) from exc

    return UploadResponse(
        message="File accepted. Processing started.",
        fileType=result["fileType"],
        datasetName=file.filename,
        cleaningSummary=result["cleaningSummary"],
    )


@router.get("/datasets/status", response_model=StatusResponse, tags=["Dataset"])
def get_status() -> StatusResponse:
    return StatusResponse(
        status=_s.status,
        datasetName=_s.dataset_name,
        isRawInput=_s.is_raw_input,
        error=_s.error,
    )


# ---------------------------------------------------------------------------
# Overview (KPIs + trends + insights)
# ---------------------------------------------------------------------------

@router.get("/datasets/overview", tags=["Analytics"])
def overview() -> dict:
    _guard()
    try:
        data = get_overview()
    except Exception as exc:  # noqa: BLE001
        raise _http_error(500, str(exc)) from exc
    return sanitize(data)


# ---------------------------------------------------------------------------
# Customer Journey
# ---------------------------------------------------------------------------

@router.get("/datasets/journey", tags=["Analytics"])
def journey(
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    sort_by: str = Query("TotalRevenue"),
    order: Literal["asc", "desc"] = Query("desc"),
) -> dict:
    _guard()
    df = _s.journey_df.copy()

    if sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=(order == "asc"))

    # Summary stats
    summary = {
        "totalCustomers": int(len(df)),
        "avgOrderCount": round(float(df["OrderCount"].mean()), 2),
        "avgTotalRevenue": round(float(df["TotalRevenue"].mean()), 2),
        "avgGapDays": round(float(df["AvgGap"].dropna().mean()), 2),
    }

    records = df.to_dict(orient="records")
    # Convert dates and nullable ints to JSON-safe types
    for rec in records:
        for k in ("FirstPurchaseDate", "LastPurchaseDate"):
            if pd.notna(rec.get(k)):
                rec[k] = str(rec[k])[:10]
        rec["CustomerID"] = int(rec["CustomerID"])

    page_result = paginate(records, page, page_size)
    page_result["summary"] = summary
    return sanitize(page_result)


# ---------------------------------------------------------------------------
# RFM Segments
# ---------------------------------------------------------------------------

@router.get("/datasets/segments", tags=["Analytics"])
def segments(
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    segment: str | None = Query(None, description="Filter by segment name"),
) -> dict:
    _guard()
    df = _s.rfm_df.copy()

    if segment:
        df = df[df["Segment"].str.lower() == segment.lower()]

    # Segment distribution counts
    seg_dist = (
        _s.rfm_df["Segment"]
        .value_counts()
        .reset_index()
    )
    seg_dist.columns = ["segment", "count"]
    seg_dist["pct"] = (seg_dist["count"] / len(_s.rfm_df) * 100).round(2)

    records = df.to_dict(orient="records")
    for rec in records:
        rec["CustomerID"] = int(rec["CustomerID"])

    page_result = paginate(records, page, page_size)
    page_result["segmentDistribution"] = seg_dist.to_dict(orient="records")
    return sanitize(page_result)


# ---------------------------------------------------------------------------
# Cohort Retention
# ---------------------------------------------------------------------------

@router.get("/datasets/cohorts", tags=["Analytics"])
def cohorts() -> dict:
    _guard()
    df = _s.cohort_df.copy()
    records = df.to_dict(orient="records")
    # Pivot for a quick heatmap representation as well
    try:
        pivot = (
            df.pivot(index="CohortMonth", columns="MonthIndex", values="RetentionPct")
            .round(1)
            .reset_index()
            .to_dict(orient="records")
        )
    except Exception:  # noqa: BLE001
        pivot = []
    return sanitize({"records": records, "retentionPivot": pivot})


# ---------------------------------------------------------------------------
# Returns
# ---------------------------------------------------------------------------

@router.get("/datasets/returns", tags=["Analytics"])
def returns(
    key_type: Literal["SKU", "Segment", "Month"] | None = Query(
        None, alias="keyType", description="Filter by breakdown type"
    ),
    flagged_only: bool = Query(False, alias="flaggedOnly"),
) -> dict:
    _guard()
    df = _s.leakage_df.copy()

    if key_type:
        df = df[df["KeyType"] == key_type]
    if flagged_only:
        df = df[df["Flagged"]]

    # Overall totals
    total_sales = float(_s.sales_df["LineValue"].sum())
    total_returns = float(_s.returns_df["LineValue"].abs().sum()) if not _s.returns_df.empty else 0.0
    portfolio_rr = total_returns / (total_sales + total_returns) if (total_sales + total_returns) > 0 else 0.0

    records = df.to_dict(orient="records")
    for rec in records:
        rec["Key"] = str(rec["Key"])

    return sanitize(
        {
            "portfolioAvgReturnRate": round(portfolio_rr, 4),
            "totalSales": round(total_sales, 2),
            "totalReturns": round(total_returns, 2),
            "records": records,
        }
    )


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

@router.get("/datasets/products", tags=["Analytics"])
def products(
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    search: str | None = Query(None, description="Search StockCode or Description"),
    category: str | None = Query(None, description="Filter by category"),
    sort_by: str = Query("NetRevenue"),
    order: Literal["asc", "desc"] = Query("desc"),
) -> dict:
    _guard()
    df = _s.product_df.copy()

    if search:
        mask = (
            df["StockCode"].str.contains(search, case=False, na=False)
            | df["Description"].str.contains(search, case=False, na=False)
        )
        df = df[mask]

    if category:
        df = df[df["Category"].str.lower() == category.lower()]

    if sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=(order == "asc"))

    # Category summary
    cat_summary = (
        _s.product_df["Category"]
        .value_counts()
        .reset_index()
    )
    cat_summary.columns = ["category", "count"]

    records = df.to_dict(orient="records")
    page_result = paginate(records, page, page_size)
    page_result["categorySummary"] = cat_summary.to_dict(orient="records")
    return sanitize(page_result)


@router.get("/datasets/products/{stock_code}", tags=["Analytics"])
def product_detail(stock_code: str) -> dict:
    _guard()
    df = _s.product_df[
        _s.product_df["StockCode"].str.upper() == stock_code.upper()
    ]
    if df.empty:
        raise _http_error(404, f"Product '{stock_code}' not found.")

    row = df.iloc[0].to_dict()

    # Monthly sales for this SKU
    monthly = (
        _s.sales_df[_s.sales_df["StockCode"].str.upper() == stock_code.upper()]
        .groupby("Month")["LineValue"]
        .agg(sales="sum", orders="count")
        .reset_index()
        .to_dict(orient="records")
    )

    return sanitize({"product": row, "monthlySales": monthly})


# ---------------------------------------------------------------------------
# Anomalies
# ---------------------------------------------------------------------------

@router.get("/datasets/anomalies", tags=["Analytics"])
def anomalies(
    method: Literal["rolling", "stl"] = Query("rolling"),
    flagged_only: bool = Query(False, alias="flaggedOnly"),
) -> dict:
    _guard()

    if method == "stl":
        try:
            df = stl_anomaly_detection(_s.sales_df)
        except ImportError as exc:
            raise _http_error(501, str(exc)) from exc
    else:
        df = _s.anomaly_df.copy()  # pre-computed rolling results

    if flagged_only:
        df = df[df["Flagged"]]

    records = df.copy()
    records["Date"] = records["Date"].astype(str)
    # AffectedCustomerIDs is already a list of ints; fine for JSON
    records_list = records.to_dict(orient="records")

    flagged_count = int(df["Flagged"].sum())
    return sanitize(
        {
            "method": method,
            "totalDays": len(records_list),
            "flaggedDays": flagged_count,
            "records": records_list,
        }
    )


# ---------------------------------------------------------------------------
# Risk
# ---------------------------------------------------------------------------

@router.get("/datasets/risk", tags=["Analytics"])
def risk(
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    band: str | None = Query(None, description="Filter: Low | Medium | High | Critical"),
    # Optional weight override — pass as ?rfm_decay=0.5&return_rate=0.2&gap_trend=0.2&anomaly=0.1
    rfm_decay: float = Query(0.40),
    return_rate: float = Query(0.25),
    gap_trend: float = Query(0.20),
    anomaly_w: float = Query(0.15, alias="anomaly"),
) -> dict:
    _guard()

    weights = {
        "rfm_decay": rfm_decay,
        "return_rate": return_rate,
        "gap_trend": gap_trend,
        "anomaly": anomaly_w,
    }

    # Validate
    try:
        _weights_obj = RiskWeightParams(
            rfm_decay=rfm_decay,
            return_rate=return_rate,
            gap_trend=gap_trend,
            anomaly=anomaly_w,
        )
    except Exception as exc:
        raise _http_error(422, str(exc)) from exc

    # Only recompute if weights differ from defaults
    default_weights = {"rfm_decay": 0.40, "return_rate": 0.25, "gap_trend": 0.20, "anomaly": 0.15}
    if weights != default_weights:
        try:
            df = customer_risk_score(
                _s.rfm_df,
                _s.cust_return_rate,
                _s.journey_df,
                _s.anomaly_df,
                _s.sales_df,
                weights=weights,
            )
        except ValueError as exc:
            raise _http_error(422, str(exc)) from exc
    else:
        df = _s.risk_df.copy()

    if band:
        df = df[df["RiskBand"].str.lower() == band.lower()]

    records = df.to_dict(orient="records")
    for rec in records:
        rec["CustomerID"] = int(rec["CustomerID"])
        rec["RiskBand"] = str(rec["RiskBand"])

    page_result = paginate(records, page, page_size)
    page_result["weights"] = weights
    return sanitize(page_result)


# ---------------------------------------------------------------------------
# Customer 360
# ---------------------------------------------------------------------------

@router.get("/datasets/customers/{customer_id}", tags=["Analytics"])
def customer_detail(customer_id: int) -> dict:
    _guard()
    try:
        data = get_customer_detail(customer_id)
    except KeyError as exc:
        raise _http_error(404, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise _http_error(500, str(exc)) from exc
    return sanitize(data)


# ---------------------------------------------------------------------------
# CSV exports
# ---------------------------------------------------------------------------

EXPORT_DISPLAY_NAMES = {
    "journey": "customer_journey",
    "rfm": "rfm_segments",
    "cohorts": "cohort_retention",
    "returns": "returns_analysis",
    "products": "product_analysis",
    "anomalies": "sales_anomalies",
    "risk": "customer_risk",
}


@router.get("/datasets/export/{table}.csv", tags=["Export"])
def export_csv(table: str) -> StreamingResponse:
    _guard()

    attr = EXPORT_TABLES.get(table)
    if attr is None:
        raise _http_error(
            404,
            f"Unknown table '{table}'. "
            f"Supported: {', '.join(EXPORT_TABLES)}",
        )

    df: pd.DataFrame | None = getattr(_s, attr, None)
    if df is None or df.empty:
        raise _http_error(404, f"Table '{table}' has no data yet.")

    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)

    display_name = EXPORT_DISPLAY_NAMES.get(table, table)
    return StreamingResponse(
        io.BytesIO(buf.getvalue().encode()),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{display_name}.csv"'
        },
    )


# ---------------------------------------------------------------------------
# Cleaned file download
# ---------------------------------------------------------------------------

@router.get("/datasets/cleaned-file", tags=["Export"])
def download_cleaned_file() -> StreamingResponse:
    _guard()

    if not _s.is_raw_input or not _s.cleaned_file_path:
        raise _http_error(
            404,
            "No cleaned file is available. "
            "This endpoint only applies when a raw file was uploaded.",
        )

    from pathlib import Path

    path = Path(_s.cleaned_file_path)
    if not path.exists():
        raise _http_error(404, "Cleaned file not found on disk.")

    return StreamingResponse(
        open(path, "rb"),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{path.name}"'
        },
    )
