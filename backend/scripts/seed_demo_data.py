"""
Seed sample retail analytics data into SalesLens PostgreSQL database.
Generates realistic multi-month retail transactions and runs the full analytics pipeline.
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path
import random

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pandas as pd
from app.cleaning import clean_raw_data, split_sales_returns
from app.analytics.journey import build_customer_journey
from app.analytics.rfm import build_rfm_table
from app.analytics.cohorts import cohort_retention
from app.analytics.returns import returns_intelligence
from app.analytics.products import product_contribution
from app.analytics.anomalies import anomaly_detection
from app.analytics.risk import customer_risk_score
from app.analytics.kpis import compute_headline_kpis, compute_monthly_trends, compute_daily_sales
from app.db_service import persist_analytics_results
from app.database import init_db, check_connection


def generate_seed_dataframe() -> pd.DataFrame:
    """Generate realistic transactions for seeding."""
    random.seed(42)
    base_date = datetime(2021, 1, 1)
    customers = [10000 + i for i in range(1, 51)]
    skus = [
        ("85123A", "WHITE HANGING HEART T-LIGHT HOLDER", 2.55),
        ("71053", "WHITE METAL LANTERN", 3.39),
        ("84406B", "CREAM CUPID HEARTS COAT HANGER", 2.75),
        ("22423", "REGENCY CAKESTAND 3 TIER", 12.75),
        ("47566", "PARTY BUNTING", 4.95),
        ("84879", "ASSORTED COLOUR BIRD ORNAMENT", 1.69),
        ("20725", "LUNCH BAG RED RETROSPOT", 1.65),
        ("22720", "SET OF 3 CAKE TINS PANTRY DESIGN", 4.95),
    ]

    rows = []
    inv_counter = 540000

    for day in range(300):
        current_date = base_date + timedelta(days=day)
        # 1 to 5 transactions per day
        daily_tx = random.randint(1, 5)
        for _ in range(daily_tx):
            cid = random.choice(customers)
            sku, desc, price = random.choice(skus)
            inv_counter += 1
            inv_no = str(inv_counter)

            # 6% return rate
            is_return = random.random() < 0.06
            if is_return:
                inv_no = f"C{inv_no}"
                qty = -random.randint(1, 4)
            else:
                qty = random.randint(1, 12)

            rows.append({
                "InvoiceNo": inv_no,
                "StockCode": sku,
                "Description": desc,
                "Quantity": qty,
                "InvoiceDate": current_date + timedelta(hours=random.randint(9, 17)),
                "UnitPrice": price,
                "CustomerID": cid,
                "Country": "United Kingdom",
            })

    return pd.DataFrame(rows)


def main():
    print("=" * 60)
    print("SalesLens — Seed PostgreSQL Database")
    print("=" * 60)

    status = check_connection()
    if not status["connected"]:
        print(f"[ERROR] Cannot connect to PostgreSQL: {status['error']}")
        sys.exit(1)

    print("Checking / initializing schema...")
    init_db()

    print("Generating sample retail transactions...")
    raw_df = generate_seed_dataframe()
    print(f"Generated {len(raw_df):,} raw transaction rows across {raw_df['CustomerID'].nunique()} customers.")

    print("Executing cleaning pipeline...")
    cleaned_df, summary = clean_raw_data(raw_df)
    sales_df, returns_df = split_sales_returns(cleaned_df)

    print("Running analytics calculations...")
    journey_df = build_customer_journey(sales_df)
    ref_date = sales_df["InvoiceDate"].max() + pd.Timedelta(days=1)
    rfm_df = build_rfm_table(sales_df, ref_date=ref_date)
    cohort_df = cohort_retention(sales_df, journey_df)
    leakage_df, cust_return_rate, _ = returns_intelligence(sales_df, returns_df, rfm_df)
    product_df = product_contribution(sales_df, returns_df)
    anomaly_df = anomaly_detection(sales_df)
    risk_df = customer_risk_score(rfm_df, cust_return_rate, journey_df, anomaly_df, sales_df)
    kpis = compute_headline_kpis(rfm_df, cohort_df, journey_df, sales_df, returns_df)
    monthly_trends = compute_monthly_trends(sales_df, returns_df)
    daily_sales = compute_daily_sales(sales_df)

    print("Persisting results into PostgreSQL...")
    ds_id = persist_analytics_results(
        filename="seed_retail_demo.csv",
        file_type="raw",
        cleaning_summary=summary,
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

    if ds_id:
        print(f"\n[SUCCESS] Seed dataset persisted to PostgreSQL with ID: {ds_id}")
        print(f"Active Customers: {kpis['activeCustomers']}")
        print(f"Net Revenue: £{kpis['netRevenue']:,.2f}")
        print(f"Return Rate: {kpis['returnRate']:.2f}%")
    else:
        print("\n[WARNING] Could not persist seed data to PostgreSQL.")
    print("=" * 60)


if __name__ == "__main__":
    main()
