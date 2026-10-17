"""
Service layer for persisting and retrieving analytics results from PostgreSQL.
Ensures transactional integrity, NaN/Null sanitization, and duplicate prevention.
"""
from __future__ import annotations

import json
import logging
import math
from typing import Any
import numpy as np
import pandas as pd
from sqlalchemy import desc, asc, func
from sqlalchemy.orm import Session

from app.database import get_session_factory
from app.models import (
    AnomalyModel,
    CohortRetentionModel,
    CustomerJourneyModel,
    CustomerRiskModel,
    DailySalesModel,
    DatasetModel,
    KpiModel,
    MonthlyTrendModel,
    ProductContributionModel,
    ReturnsIntelligenceModel,
    RfmSegmentModel,
)

logger = logging.getLogger("saleslens.db_service")


def _sanitize_val(val: Any) -> Any:
    """Convert pandas/numpy NaN, NaT, or Inf values to None for clean SQL insertion."""
    if val is None:
        return None
    if isinstance(val, (float, np.floating)):
        if math.isnan(val) or math.isinf(val):
            return None
        return float(val)
    if isinstance(val, (np.integer, int)):
        return int(val)
    if pd.isna(val):
        return None
    return val


def persist_analytics_results(
    filename: str,
    file_type: str,
    cleaning_summary: dict[str, Any],
    kpis: dict[str, Any],
    monthly_trends: list[dict[str, Any]],
    daily_sales: list[dict[str, Any]],
    journey_df: pd.DataFrame,
    rfm_df: pd.DataFrame,
    cohort_df: pd.DataFrame,
    leakage_df: pd.DataFrame,
    product_df: pd.DataFrame,
    anomaly_df: pd.DataFrame,
    risk_df: pd.DataFrame,
) -> int | None:
    """
    Persist all computed analytics results into PostgreSQL in an atomic transaction.
    Deactivates any previous runs for this dataset to prevent duplicates.
    """
    factory = get_session_factory()
    if factory is None:
        logger.info("Database not configured; skipping PostgreSQL persistence.")
        return None

    db: Session = factory()
    try:
        with db.begin():
            # Mark previous active datasets with this name as inactive
            db.query(DatasetModel).filter(
                DatasetModel.dataset_name == filename,
                DatasetModel.is_active == True,  # noqa: E712
            ).update({"is_active": False})

            # 1. Insert Dataset Record
            dataset = DatasetModel(
                dataset_name=filename,
                file_type=file_type,
                original_rows=_sanitize_val(cleaning_summary.get("originalRows")),
                final_rows=_sanitize_val(cleaning_summary.get("finalRows")),
                sales_rows=_sanitize_val(cleaning_summary.get("salesRows")),
                return_rows=_sanitize_val(cleaning_summary.get("returnRows")),
                gross_sales=_sanitize_val(cleaning_summary.get("grossSales")),
                total_returns=_sanitize_val(cleaning_summary.get("returnValue")),
                net_revenue=_sanitize_val(cleaning_summary.get("netRevenue")),
                is_active=True,
            )
            db.add(dataset)
            db.flush()  # Populates dataset.id
            ds_id = dataset.id

            # 2. Insert KPIs
            kpi_entry = KpiModel(
                dataset_id=ds_id,
                active_customers=int(_sanitize_val(kpis.get("activeCustomers")) or 0),
                repeat_rate=float(_sanitize_val(kpis.get("repeatRate")) or 0.0),
                churn_rate_indicative=_sanitize_val(kpis.get("churnRateIndicative")),
                rev_retention=_sanitize_val(kpis.get("revRetention")),
                net_revenue=float(_sanitize_val(kpis.get("netRevenue")) or 0.0),
                gross_sales=float(_sanitize_val(kpis.get("grossSales")) or 0.0),
                total_returns=float(_sanitize_val(kpis.get("totalReturns")) or 0.0),
                total_customers=int(_sanitize_val(kpis.get("totalCustomers")) or 0),
                return_rate=float(_sanitize_val(kpis.get("returnRate")) or 0.0),
            )
            db.add(kpi_entry)

            # 3. Monthly Trends
            for m in monthly_trends:
                db.add(
                    MonthlyTrendModel(
                        dataset_id=ds_id,
                        month=str(m.get("month")),
                        sales=float(_sanitize_val(m.get("sales")) or 0.0),
                        returns=float(_sanitize_val(m.get("returns")) or 0.0),
                        return_rate=float(_sanitize_val(m.get("returnRate")) or 0.0),
                    )
                )

            # 4. Daily Sales
            for d in daily_sales:
                cids = d.get("affectedCustomerIDs") or []
                cids_str = json.dumps([int(c) for c in cids]) if cids else None
                date_val = pd.to_datetime(d.get("date")).date() if d.get("date") else None
                db.add(
                    DailySalesModel(
                        dataset_id=ds_id,
                        sale_date=date_val,
                        sales=float(_sanitize_val(d.get("sales")) or 0.0),
                        mean=float(_sanitize_val(d.get("mean")) or 0.0),
                        std=float(_sanitize_val(d.get("std")) or 0.0),
                        z_score=float(_sanitize_val(d.get("zScore")) or 0.0),
                        flagged=bool(d.get("flagged")),
                        direction=d.get("direction"),
                        affected_customer_ids=cids_str,
                    )
                )

            # 5. Customer Journey
            if journey_df is not None and not journey_df.empty:
                journey_records = []
                for _, row in journey_df.iterrows():
                    fdate = pd.to_datetime(row["FirstPurchaseDate"]).date() if pd.notna(row.get("FirstPurchaseDate")) else None
                    ldate = pd.to_datetime(row["LastPurchaseDate"]).date() if pd.notna(row.get("LastPurchaseDate")) else None
                    journey_records.append(
                        CustomerJourneyModel(
                            dataset_id=ds_id,
                            customer_id=int(row["CustomerID"]),
                            order_count=int(row["OrderCount"]),
                            first_purchase_date=fdate,
                            last_purchase_date=ldate,
                            total_revenue=float(_sanitize_val(row["TotalRevenue"]) or 0.0),
                            avg_gap=_sanitize_val(row.get("AvgGap", row.get("avg_gap"))),
                            gap_trend=_sanitize_val(row.get("GapTrend", row.get("gap_trend"))),
                        )
                    )
                db.bulk_save_objects(journey_records)

            # 6. RFM Segments
            if rfm_df is not None and not rfm_df.empty:
                rfm_records = []
                for _, row in rfm_df.iterrows():
                    rfm_records.append(
                        RfmSegmentModel(
                            dataset_id=ds_id,
                            customer_id=int(row["CustomerID"]),
                            recency=int(row["Recency"]),
                            frequency=int(row["Frequency"]),
                            monetary=float(_sanitize_val(row["Monetary"]) or 0.0),
                            r_score=int(row["R_Score"]),
                            f_score=int(row["F_Score"]),
                            m_score=int(row["M_Score"]),
                            rfm_score=int(row["RFM_Score"]),
                            segment=str(row["Segment"]),
                        )
                    )
                db.bulk_save_objects(rfm_records)

            # 7. Cohort Retention
            if cohort_df is not None and not cohort_df.empty:
                cohort_records = []
                for _, row in cohort_df.iterrows():
                    cohort_records.append(
                        CohortRetentionModel(
                            dataset_id=ds_id,
                            cohort_month=str(row["CohortMonth"]),
                            month_index=int(row["MonthIndex"]),
                            cohort_size=int(row["CohortSize"]),
                            retention_pct=float(_sanitize_val(row["RetentionPct"]) or 0.0),
                            retention_rev_pct=_sanitize_val(row.get("RevenuePct", row.get("RetentionRevPct"))),
                        )
                    )
                db.bulk_save_objects(cohort_records)

            # 8. Returns Intelligence
            if leakage_df is not None and not leakage_df.empty:
                ret_records = []
                for _, row in leakage_df.iterrows():
                    ret_records.append(
                        ReturnsIntelligenceModel(
                            dataset_id=ds_id,
                            key_name=str(row["Key"]),
                            key_type=str(row["KeyType"]),
                            sales=float(_sanitize_val(row["Sales"]) or 0.0),
                            returns=float(_sanitize_val(row["Returns"]) or 0.0),
                            return_rate=float(_sanitize_val(row["ReturnRate"]) or 0.0),
                            flagged=bool(row.get("Flagged", False)),
                        )
                    )
                db.bulk_save_objects(ret_records)

            # 9. Product Contribution
            if product_df is not None and not product_df.empty:
                prod_records = []
                for _, row in product_df.iterrows():
                    prod_records.append(
                        ProductContributionModel(
                            dataset_id=ds_id,
                            stock_code=str(row["StockCode"]),
                            description=str(row.get("Description", "Unknown")),
                            gross_sales=float(_sanitize_val(row["GrossSales"]) or 0.0),
                            returned_value=float(_sanitize_val(row.get("ReturnValue", row.get("ReturnedValue", 0.0))) or 0.0),
                            net_revenue=float(_sanitize_val(row.get("NetRevenue", 0.0)) or 0.0),
                            buyers=int(_sanitize_val(row.get("Buyers", row.get("BuyerCount", 0))) or 0),
                            return_rate=float(_sanitize_val(row.get("ReturnRate", 0.0)) or 0.0),
                            repeat_attach_rate=_sanitize_val(row.get("RepeatAttachRate")),
                            category=str(row.get("Category", "Standard")),
                        )
                    )
                db.bulk_save_objects(prod_records)

            # 10. Anomalies
            if anomaly_df is not None and not anomaly_df.empty:
                anomaly_records = []
                for _, row in anomaly_df.iterrows():
                    adate = pd.to_datetime(row["Date"]).date() if pd.notna(row.get("Date")) else None
                    cids = row.get("AffectedCustomerIDs")
                    cids_str = json.dumps([int(c) for c in cids]) if isinstance(cids, (list, np.ndarray)) else None
                    anomaly_records.append(
                        AnomalyModel(
                            dataset_id=ds_id,
                            anomaly_date=adate,
                            sales=float(_sanitize_val(row.get("Sales", 0.0)) or 0.0),
                            mean=float(_sanitize_val(row.get("mean", row.get("Mean", 0.0))) or 0.0),
                            std=float(_sanitize_val(row.get("std", row.get("Std", 0.0))) or 0.0),
                            z_score=float(_sanitize_val(row.get("z_score", row.get("ZScore", 0.0))) or 0.0),
                            flagged=bool(row.get("Flagged", False)),
                            direction=row.get("AnomalyType", row.get("Direction")),
                            affected_customer_ids=cids_str,
                        )
                    )
                db.bulk_save_objects(anomaly_records)

            # 11. Customer Risk
            if risk_df is not None and not risk_df.empty:
                risk_records = []
                for _, row in risk_df.iterrows():
                    risk_records.append(
                        CustomerRiskModel(
                            dataset_id=ds_id,
                            customer_id=int(row["CustomerID"]),
                            risk_score=float(_sanitize_val(row.get("RiskScore", 0.0)) or 0.0),
                            risk_band=str(row.get("RiskBand", "Low")),
                            main_reason=str(row.get("MainReason", "")),
                            rfm_decay=float(_sanitize_val(row.get("rfm_decay", row.get("RFMDecay", 0.0))) or 0.0),
                            return_rate=float(_sanitize_val(row.get("return_rate", row.get("ReturnRate", 0.0))) or 0.0),
                            gap_trend=float(_sanitize_val(row.get("gap_trend", row.get("GapTrend", 0.0))) or 0.0),
                            anomaly=float(_sanitize_val(row.get("anomaly", row.get("Anomaly", 0.0))) or 0.0),
                        )
                    )
                db.bulk_save_objects(risk_records)

            logger.info("Persisted analytics for dataset '%s' (ID: %d) into PostgreSQL.", filename, ds_id)
            return ds_id

    except Exception as exc:
        logger.error("Failed to persist analytics results to PostgreSQL: %s", exc, exc_info=True)
        return None
    finally:
        db.close()


def get_active_dataset(db: Session) -> DatasetModel | None:
    """Retrieve the currently active dataset."""
    return db.query(DatasetModel).filter(DatasetModel.is_active == True).order_by(DatasetModel.id.desc()).first()  # noqa: E712


def list_datasets(db: Session) -> list[dict[str, Any]]:
    """List all stored datasets formatted for the UI."""
    rows = db.query(DatasetModel).order_by(DatasetModel.id.desc()).all()
    return [
        {
            "id": str(r.id),
            "name": r.dataset_name,
            "uploaded": r.uploaded_at.strftime("%Y-%m-%d %H:%M") if r.uploaded_at else "Unknown",
            "rows": r.final_rows or r.original_rows or 0,
            "status": "Processed" if r.is_active else "Archived",
            "primary": bool(r.is_active),
        }
        for r in rows
    ]


def get_stored_overview(db: Session, dataset_id: int) -> dict[str, Any] | None:
    """Retrieve overview metrics from database for a dataset."""
    kpi = db.query(KpiModel).filter(KpiModel.dataset_id == dataset_id).first()
    if not kpi:
        return None

    # Trends
    trends = db.query(MonthlyTrendModel).filter(MonthlyTrendModel.dataset_id == dataset_id).order_by(MonthlyTrendModel.month.asc()).all()
    # Daily sales
    daily = db.query(DailySalesModel).filter(DailySalesModel.dataset_id == dataset_id).order_by(DailySalesModel.sale_date.asc()).all()
    # Top risk customers
    top_risk = db.query(CustomerRiskModel).filter(CustomerRiskModel.dataset_id == dataset_id).order_by(CustomerRiskModel.risk_score.desc()).limit(10).all()
    # Segment distribution
    rfm_counts = db.query(RfmSegmentModel.segment, func.count(RfmSegmentModel.id)).filter(RfmSegmentModel.dataset_id == dataset_id).group_by(RfmSegmentModel.segment).all()
    total_rfm = sum(cnt for _, cnt in rfm_counts) or 1

    return {
        "kpis": {
            "activeCustomers": kpi.active_customers,
            "repeatRate": kpi.repeat_rate,
            "churnRateIndicative": kpi.churn_rate_indicative,
            "revRetention": kpi.rev_retention,
            "netRevenue": kpi.net_revenue,
            "grossSales": kpi.gross_sales,
            "totalReturns": kpi.total_returns,
            "totalCustomers": kpi.total_customers,
            "returnRate": kpi.return_rate,
        },
        "monthlyTrends": [
            {"month": t.month, "sales": t.sales, "returns": t.returns, "returnRate": t.return_rate}
            for t in trends
        ],
        "dailySales": [
            {
                "date": str(d.sale_date),
                "sales": d.sales,
                "mean": d.mean,
                "std": d.std,
                "zScore": d.z_score,
                "flagged": d.flagged,
                "direction": d.direction,
                "affectedCustomerIDs": json.loads(d.affected_customer_ids) if d.affected_customer_ids else [],
            }
            for d in daily
        ],
        "segmentDistribution": [
            {"segment": seg, "count": cnt, "pct": round(cnt / total_rfm * 100, 2)}
            for seg, cnt in rfm_counts
        ],
        "highRiskCustomers": [
            {
                "customerId": r.customer_id,
                "riskScore": r.risk_score,
                "riskBand": r.risk_band,
                "mainReason": r.main_reason,
                "segment": "Customer",
            }
            for r in top_risk
        ],
        "insights": [
            f"Database loaded: {kpi.active_customers:,} active customers analyzed.",
            f"Total net revenue stands at £{kpi.net_revenue:,.2f} with a {kpi.return_rate:.1f}% portfolio return rate.",
            f"Overall repeat purchase rate is {kpi.repeat_rate:.1f}%.",
        ],
    }
