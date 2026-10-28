"""
Tests for PostgreSQL database integration and models in Acuity.
"""
from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import (
    DatasetModel,
    KpiModel,
    MonthlyTrendModel,
    CustomerJourneyModel,
    RfmSegmentModel,
    CohortRetentionModel,
    ReturnsIntelligenceModel,
    ProductContributionModel,
    AnomalyModel,
    CustomerRiskModel,
)
from app.db_service import _sanitize_val


def test_sanitize_val():
    assert _sanitize_val(None) is None
    assert _sanitize_val(float("nan")) is None
    assert _sanitize_val(float("inf")) is None
    assert _sanitize_val(123) == 123
    assert _sanitize_val(45.67) == 45.67
    assert _sanitize_val("test") == "test"


def test_schema_creation_in_memory():
    """Verify that all ORM tables compile cleanly against an engine."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    table_names = Base.metadata.tables.keys()

    expected_tables = {
        "datasets",
        "dashboard_kpis",
        "monthly_trends",
        "daily_sales",
        "customer_journey",
        "rfm_segments",
        "cohort_retention",
        "returns_intelligence",
        "product_contribution",
        "anomalies",
        "customer_risk",
    }
    for t in expected_tables:
        assert t in table_names, f"Expected table '{t}' in database schema."


def test_dataset_relationship_cascade():
    """Test that deleting a dataset cascades to related analytics tables."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    ds = DatasetModel(dataset_name="test.csv", file_type="raw", is_active=True)
    db.add(ds)
    db.commit()

    kpi = KpiModel(
        dataset_id=ds.id,
        active_customers=10,
        repeat_rate=0.5,
        net_revenue=1000.0,
        gross_sales=1200.0,
        total_returns=200.0,
        total_customers=15,
        return_rate=0.1,
    )
    db.add(kpi)
    db.commit()

    assert db.query(KpiModel).filter(KpiModel.dataset_id == ds.id).count() == 1

    db.delete(ds)
    db.commit()

    assert db.query(KpiModel).filter(KpiModel.dataset_id == ds.id).count() == 0
    db.close()


def test_list_and_get_stored_overview():
    """Test retrieving stored overview and dataset listing."""
    from app.db_service import list_datasets, get_stored_overview
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    ds = DatasetModel(
        dataset_name="online_retail_cleaned.xlsx",
        file_type="cleaned",
        original_rows=50000,
        final_rows=45000,
        net_revenue=85000.0,
        is_active=True,
    )
    db.add(ds)
    db.commit()

    kpi = KpiModel(
        dataset_id=ds.id,
        active_customers=1200,
        repeat_rate=0.68,
        churn_rate_indicative=0.05,
        rev_retention=0.92,
        net_revenue=85000.0,
        gross_sales=90000.0,
        total_returns=5000.0,
        total_customers=1500,
        return_rate=0.055,
    )
    db.add(kpi)
    db.commit()

    # Test list_datasets
    datasets = list_datasets(db)
    assert len(datasets) == 1
    assert datasets[0]["name"] == "online_retail_cleaned.xlsx"
    assert datasets[0]["status"] == "Processed"
    assert datasets[0]["primary"] is True

    # Test get_stored_overview
    overview = get_stored_overview(db, ds.id)
    assert overview is not None
    assert overview["kpis"]["activeCustomers"] == 1200
    assert overview["kpis"]["netRevenue"] == 85000.0
    assert len(overview["insights"]) > 0

    db.close()

