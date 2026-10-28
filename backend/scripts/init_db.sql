-- =============================================================================
-- Acuity — PostgreSQL Database Initialization Script
-- =============================================================================
-- Database: acuity_db
-- Description: Creates relational schema for persisted analytics results.
-- =============================================================================

-- 1. Datasets table (Tracks uploaded files and processing metadata)
CREATE TABLE IF NOT EXISTS datasets (
    id SERIAL PRIMARY KEY,
    dataset_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL DEFAULT 'raw',
    original_rows INTEGER,
    final_rows INTEGER,
    sales_rows INTEGER,
    return_rows INTEGER,
    gross_sales DOUBLE PRECISION,
    total_returns DOUBLE PRECISION,
    net_revenue DOUBLE PRECISION,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_datasets_name ON datasets(dataset_name);
CREATE INDEX IF NOT EXISTS idx_datasets_is_active ON datasets(is_active);

-- 2. Dashboard Headline KPIs
CREATE TABLE IF NOT EXISTS dashboard_kpis (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    active_customers INTEGER NOT NULL,
    repeat_rate DOUBLE PRECISION NOT NULL,
    churn_rate_indicative DOUBLE PRECISION,
    rev_retention DOUBLE PRECISION,
    net_revenue DOUBLE PRECISION NOT NULL,
    gross_sales DOUBLE PRECISION NOT NULL,
    total_returns DOUBLE PRECISION NOT NULL,
    total_customers INTEGER NOT NULL,
    return_rate DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kpis_dataset_id ON dashboard_kpis(dataset_id);

-- 3. Monthly Trends
CREATE TABLE IF NOT EXISTS monthly_trends (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    month VARCHAR(10) NOT NULL,
    sales DOUBLE PRECISION NOT NULL,
    returns DOUBLE PRECISION NOT NULL,
    return_rate DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_monthly_trends_ds_month ON monthly_trends(dataset_id, month);

-- 4. Daily Sales & Rolling Anomaly Points
CREATE TABLE IF NOT EXISTS daily_sales (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    sale_date DATE NOT NULL,
    sales DOUBLE PRECISION NOT NULL,
    mean DOUBLE PRECISION NOT NULL,
    std DOUBLE PRECISION NOT NULL,
    z_score DOUBLE PRECISION NOT NULL,
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    direction VARCHAR(50),
    affected_customer_ids TEXT
);
CREATE INDEX IF NOT EXISTS idx_daily_sales_ds_date ON daily_sales(dataset_id, sale_date);

-- 5. Customer Journey
CREATE TABLE IF NOT EXISTS customer_journey (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL,
    order_count INTEGER NOT NULL,
    first_purchase_date DATE,
    last_purchase_date DATE,
    total_revenue DOUBLE PRECISION NOT NULL,
    avg_gap DOUBLE PRECISION,
    gap_trend DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_journey_ds_customer ON customer_journey(dataset_id, customer_id);

-- 6. RFM Segments
CREATE TABLE IF NOT EXISTS rfm_segments (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL,
    recency INTEGER NOT NULL,
    frequency INTEGER NOT NULL,
    monetary DOUBLE PRECISION NOT NULL,
    r_score INTEGER NOT NULL,
    f_score INTEGER NOT NULL,
    m_score INTEGER NOT NULL,
    rfm_score INTEGER NOT NULL,
    segment VARCHAR(50) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rfm_ds_customer ON rfm_segments(dataset_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_rfm_ds_segment ON rfm_segments(dataset_id, segment);

-- 7. Cohort Retention
CREATE TABLE IF NOT EXISTS cohort_retention (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    cohort_month VARCHAR(10) NOT NULL,
    month_index INTEGER NOT NULL,
    cohort_size INTEGER NOT NULL,
    retention_pct DOUBLE PRECISION NOT NULL,
    retention_rev_pct DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_cohorts_ds_month ON cohort_retention(dataset_id, cohort_month);

-- 8. Returns Intelligence
CREATE TABLE IF NOT EXISTS returns_intelligence (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    key_type VARCHAR(20) NOT NULL,
    sales DOUBLE PRECISION NOT NULL,
    returns DOUBLE PRECISION NOT NULL,
    return_rate DOUBLE PRECISION NOT NULL,
    flagged BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_returns_ds_type ON returns_intelligence(dataset_id, key_type);

-- 9. Product Contribution
CREATE TABLE IF NOT EXISTS product_contribution (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    stock_code VARCHAR(50) NOT NULL,
    description TEXT,
    gross_sales DOUBLE PRECISION NOT NULL,
    returned_value DOUBLE PRECISION NOT NULL,
    net_revenue DOUBLE PRECISION NOT NULL,
    buyers INTEGER NOT NULL,
    return_rate DOUBLE PRECISION NOT NULL,
    repeat_attach_rate DOUBLE PRECISION,
    category VARCHAR(50) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_ds_sku ON product_contribution(dataset_id, stock_code);
CREATE INDEX IF NOT EXISTS idx_products_ds_category ON product_contribution(dataset_id, category);

-- 10. Anomalies Flagged
CREATE TABLE IF NOT EXISTS anomalies (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    anomaly_date DATE NOT NULL,
    sales DOUBLE PRECISION NOT NULL,
    mean DOUBLE PRECISION NOT NULL,
    std DOUBLE PRECISION NOT NULL,
    z_score DOUBLE PRECISION NOT NULL,
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    direction VARCHAR(50),
    affected_customer_ids TEXT
);
CREATE INDEX IF NOT EXISTS idx_anomalies_ds_date ON anomalies(dataset_id, anomaly_date);

-- 11. Customer Risk Scores
CREATE TABLE IF NOT EXISTS customer_risk (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL,
    risk_score DOUBLE PRECISION NOT NULL,
    risk_band VARCHAR(20) NOT NULL,
    main_reason TEXT NOT NULL,
    rfm_decay DOUBLE PRECISION NOT NULL,
    return_rate DOUBLE PRECISION NOT NULL,
    gap_trend DOUBLE PRECISION NOT NULL,
    anomaly DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_risk_ds_customer ON customer_risk(dataset_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_risk_ds_band ON customer_risk(dataset_id, risk_band);
