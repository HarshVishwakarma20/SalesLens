"""
SQLAlchemy ORM models for Acuity PostgreSQL database integration.
Defines schemas for persistence of all analytics outputs and dataset metadata.
"""
from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class DatasetModel(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_name = Column(String(255), nullable=False, index=True)
    file_type = Column(String(50), nullable=False, default="raw")
    original_rows = Column(Integer, nullable=True)
    final_rows = Column(Integer, nullable=True)
    sales_rows = Column(Integer, nullable=True)
    return_rows = Column(Integer, nullable=True)
    gross_sales = Column(Float, nullable=True)
    total_returns = Column(Float, nullable=True)
    net_revenue = Column(Float, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True, index=True)

    # Relationships
    kpis = relationship("KpiModel", back_populates="dataset", cascade="all, delete-orphan")
    monthly_trends = relationship("MonthlyTrendModel", back_populates="dataset", cascade="all, delete-orphan")
    daily_sales = relationship("DailySalesModel", back_populates="dataset", cascade="all, delete-orphan")
    journey_records = relationship("CustomerJourneyModel", back_populates="dataset", cascade="all, delete-orphan")
    rfm_records = relationship("RfmSegmentModel", back_populates="dataset", cascade="all, delete-orphan")
    cohort_records = relationship("CohortRetentionModel", back_populates="dataset", cascade="all, delete-orphan")
    returns_records = relationship("ReturnsIntelligenceModel", back_populates="dataset", cascade="all, delete-orphan")
    product_records = relationship("ProductContributionModel", back_populates="dataset", cascade="all, delete-orphan")
    anomaly_records = relationship("AnomalyModel", back_populates="dataset", cascade="all, delete-orphan")
    risk_records = relationship("CustomerRiskModel", back_populates="dataset", cascade="all, delete-orphan")


class KpiModel(Base):
    __tablename__ = "dashboard_kpis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    active_customers = Column(Integer, nullable=False)
    repeat_rate = Column(Float, nullable=False)
    churn_rate_indicative = Column(Float, nullable=True)
    rev_retention = Column(Float, nullable=True)
    net_revenue = Column(Float, nullable=False)
    gross_sales = Column(Float, nullable=False)
    total_returns = Column(Float, nullable=False)
    total_customers = Column(Integer, nullable=False)
    return_rate = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    dataset = relationship("DatasetModel", back_populates="kpis")


class MonthlyTrendModel(Base):
    __tablename__ = "monthly_trends"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    month = Column(String(10), nullable=False, index=True)  # YYYY-MM
    sales = Column(Float, nullable=False)
    returns = Column(Float, nullable=False)
    return_rate = Column(Float, nullable=False)

    dataset = relationship("DatasetModel", back_populates="monthly_trends")


class DailySalesModel(Base):
    __tablename__ = "daily_sales"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    sale_date = Column(Date, nullable=False, index=True)
    sales = Column(Float, nullable=False)
    mean = Column(Float, nullable=False)
    std = Column(Float, nullable=False)
    z_score = Column(Float, nullable=False)
    flagged = Column(Boolean, nullable=False, default=False)
    direction = Column(String(50), nullable=True)
    affected_customer_ids = Column(Text, nullable=True)

    dataset = relationship("DatasetModel", back_populates="daily_sales")


class CustomerJourneyModel(Base):
    __tablename__ = "customer_journey"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(BigInteger, nullable=False, index=True)
    order_count = Column(Integer, nullable=False)
    first_purchase_date = Column(Date, nullable=True)
    last_purchase_date = Column(Date, nullable=True)
    total_revenue = Column(Float, nullable=False)
    avg_gap = Column(Float, nullable=True)
    gap_trend = Column(Float, nullable=True)

    dataset = relationship("DatasetModel", back_populates="journey_records")


class RfmSegmentModel(Base):
    __tablename__ = "rfm_segments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(BigInteger, nullable=False, index=True)
    recency = Column(Integer, nullable=False)
    frequency = Column(Integer, nullable=False)
    monetary = Column(Float, nullable=False)
    r_score = Column(Integer, nullable=False)
    f_score = Column(Integer, nullable=False)
    m_score = Column(Integer, nullable=False)
    rfm_score = Column(Integer, nullable=False)
    segment = Column(String(50), nullable=False, index=True)

    dataset = relationship("DatasetModel", back_populates="rfm_records")


class CohortRetentionModel(Base):
    __tablename__ = "cohort_retention"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    cohort_month = Column(String(10), nullable=False, index=True)  # YYYY-MM
    month_index = Column(Integer, nullable=False)
    cohort_size = Column(Integer, nullable=False)
    retention_pct = Column(Float, nullable=False)
    retention_rev_pct = Column(Float, nullable=True)

    dataset = relationship("DatasetModel", back_populates="cohort_records")


class ReturnsIntelligenceModel(Base):
    __tablename__ = "returns_intelligence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    key_name = Column(String(100), nullable=False, index=True)
    key_type = Column(String(20), nullable=False, index=True)  # SKU, Segment, Month
    sales = Column(Float, nullable=False)
    returns = Column(Float, nullable=False)
    return_rate = Column(Float, nullable=False)
    flagged = Column(Boolean, nullable=False, default=False)

    dataset = relationship("DatasetModel", back_populates="returns_records")


class ProductContributionModel(Base):
    __tablename__ = "product_contribution"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    stock_code = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=True)
    gross_sales = Column(Float, nullable=False)
    returned_value = Column(Float, nullable=False)
    net_revenue = Column(Float, nullable=False)
    buyers = Column(Integer, nullable=False)
    return_rate = Column(Float, nullable=False)
    repeat_attach_rate = Column(Float, nullable=True)
    category = Column(String(50), nullable=False, index=True)

    dataset = relationship("DatasetModel", back_populates="product_records")


class AnomalyModel(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    anomaly_date = Column(Date, nullable=False, index=True)
    sales = Column(Float, nullable=False)
    mean = Column(Float, nullable=False)
    std = Column(Float, nullable=False)
    z_score = Column(Float, nullable=False)
    flagged = Column(Boolean, nullable=False, default=False)
    direction = Column(String(50), nullable=True)
    affected_customer_ids = Column(Text, nullable=True)

    dataset = relationship("DatasetModel", back_populates="anomaly_records")


class CustomerRiskModel(Base):
    __tablename__ = "customer_risk"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(BigInteger, nullable=False, index=True)
    risk_score = Column(Float, nullable=False)
    risk_band = Column(String(20), nullable=False, index=True)
    main_reason = Column(Text, nullable=False)
    rfm_decay = Column(Float, nullable=False)
    return_rate = Column(Float, nullable=False)
    gap_trend = Column(Float, nullable=False)
    anomaly = Column(Float, nullable=False)

    dataset = relationship("DatasetModel", back_populates="risk_records")
