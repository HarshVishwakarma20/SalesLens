# SalesLens: Enterprise Customer and Retail Analytics Platform

SalesLens is an end-to-end customer intelligence and retail revenue diagnostics platform. It transforms raw e-commerce transaction logs into executive-ready dashboards, RFM segmentations, cohort retention matrices, returns leakage diagnostics, demand anomaly alerts, churn risk indices, and multi-page board-level PDF reports.

---

## 1. Executive Summary

Traditional retail reporting often relies on static spreadsheets or opaque black-box machine learning models that business stakeholders cannot verify. SalesLens bridges this gap by combining an automated deterministic data cleaning pipeline, rigorous statistical analytics models, transactional PostgreSQL persistence, and interactive visualization in a unified web application.

Key capabilities:
- Automated Data Cleaning: Ingests raw multi-megabyte CSV and Excel files, resolving cancellations, removing non-product service charges, stripping trailing currency symbols, and tracking data hygiene across a 7-stage pipeline.
- Customer Segmentation: Computes deterministic quintile-based Recency, Frequency, and Monetary (RFM) scores to categorize customers into actionable tiers.
- Retention and Cohort Longevity: Generates dynamic triangle retention heatmaps and multi-cohort retention decay curves across customer volume and net revenue.
- Returns and Revenue Leakage Intelligence: Uncovers SKU-level and segment-level returns that erode gross turnover, benchmarking individual lines against portfolio averages.
- Demand Anomaly Detection: Employs 30-day rolling Gaussian z-score calculations and seasonal decomposition to detect demand spikes and revenue drops with customer attribution.
- Multi-Factor Churn Risk Engine: Calculates composite risk scores (0 to 100) using configurable weights across RFM decay, individual return rates, inter-purchase intervals, and demand volatility.
- Cross-Dataset Comparison: Benchmarks current operating performance against historical or baseline datasets with scale normalization and migration tracking.
- 5-Page Board-Level PDF Reporting: Generates corporate-grade vector PDF reports with custom headers, KPI scorecards, styled data tables, risk watchlists, catalog diagnostics, and a 90-day strategic action roadmap.
- Storage Management: Includes backend and frontend controls to purge temporary files and delete stored datasets to prevent disk bloat.

---

## 2. Technology Stack

| Layer | Component | Specification | Description |
|---|---|---|---|
| Frontend Framework | React 18 | React 18.3.1, TypeScript 5.8 | Modern component architecture with strict typing |
| Build Tool | Vite | Vite 8.3.4 | Ultra-fast HMR and optimized production bundling |
| Styling and Tokens | Tailwind CSS | Tailwind CSS v4, Vanilla CSS tokens | Custom corporate design system with dark mode |
| Charting Engine | Apache ECharts | ECharts 6.1.0 via echarts-for-react | Responsive, GPU-accelerated interactive visualizations |
| Client State | Zustand + React Query | Zustand 5.0, TanStack Query 5.104 | Normalized client state with zero-latency cache invalidation |
| PDF Export | jsPDF + autoTable | jsPDF 4.2.1, jspdf-autotable 5.0.9 | Client-side 5-page vector executive PDF report generator |
| Backend Framework | FastAPI | FastAPI 0.111.0, Uvicorn 0.29.0 | High-performance asynchronous Python API |
| Data Processing | Pandas + NumPy | Pandas 2.2.0, NumPy 1.26.0 | Vectorized dataframe cleaning and statistical computations |
| Statistics | Statsmodels | Statsmodels 0.14.2 | STL decomposition and rolling time-series calculations |
| Database and ORM | PostgreSQL + SQLAlchemy | SQLAlchemy 2.0.0, psycopg2-binary | Relational persistence with cascade deletion integrity |
| File I/O Engine | OpenPyXL + PyArrow | OpenPyXL 3.1.2, PyArrow 15.0.0 | High-throughput parsing for Excel (.xlsx) and CSV datasets |

---

## 3. System Architecture and Data Flow

```mermaid
flowchart TD
    subgraph Client [Browser Frontend - React + Vite + TypeScript]
        UI[Interactive Dashboard Pages]
        UploadUI[Upload & File Dropzone]
        RecentUI[Recent Datasets & Storage Manager]
        PDFGen[5-Page Executive PDF Engine]
        CompareUI[Compare & Benchmarking Tab]
    end

    subgraph API [Backend API - FastAPI]
        Router[API Gateway /api/v1]
        CleanSvc[Cleaning Pipeline Service]
        AnalyticsSvc[Vectorized Analytics Engine]
        StateSvc[In-Memory Cache State]
    end

    subgraph Storage [Persistence & File System]
        PG[(PostgreSQL Database)]
        DiskStore[backend/storage/ Excel & CSV Store]
    end

    UploadUI -->|POST /datasets/upload| Router
    Router --> CleanSvc
    CleanSvc --> DiskStore
    CleanSvc --> AnalyticsSvc
    AnalyticsSvc --> StateSvc
    AnalyticsSvc -->|Atomic Transaction| PG

    Router -->|GET /datasets/overview| UI
    Router -->|GET /datasets/report-data| PDFGen
    Router -->|GET /datasets| RecentUI
    RecentUI -->|DELETE /datasets/{id}| Router
    RecentUI -->|POST /datasets/clear| Router
    Router -->|Purge Files| DiskStore
    Router -->|Cascade Delete| PG

    StateSvc -.->|Fast Read| Router
    PG -.->|Cold Start Hydration| Router
```

---

## 4. Data Cleaning and Quality Pipeline

SalesLens processes transaction logs using a 7-stage deterministic pipeline implemented in `backend/app/cleaning.py`:

1. Column Normalization and Header Mapping:
   Standardizes diverse retail headers into canonical schema names: `InvoiceNo`, `StockCode`, `Description`, `Quantity`, `InvoiceDate`, `UnitPrice`, `CustomerID`, and `Country`.
2. Cancellation and Correction Pairing:
   Detects invoice prefixes (such as `C` or `c`) and negative quantities. Matches cancellation records against positive sales rows by CustomerID, StockCode, and absolute quantity to calculate net revenue accurately.
3. Service and Non-Product Charge Elimination:
   Identifies and isolates overhead and postal codes (e.g., `POST`, `D`, `DOT`, `M`, `BANK CHARGES`, `AMAZONFEE`) to ensure sales analytics reflect physical catalog performance.
4. Currency Symbol Stripping and Price Sanitization:
   Automatically detects local currency identifiers (e.g., GBP, EUR, USD, INR), removes symbol prefixes and commas, converts values to IEEE 754 floating point numbers, and discards negative unit prices.
5. Missing Customer ID Handling:
   Separates institutional anonymous sales from authenticated registered customer orders, maintaining aggregate turnover metrics while preventing skewed RFM segmentation.
6. Exact and Logical Deduplication:
   Detects and purges duplicate log entries resulting from retry storms, system re-transmissions, or multi-channel synchronization lags.
7. Output Segregation:
   Generates a cleaned master dataframe and splits transactions into positive sales rows and negative return rows with calculated `LineValue = Quantity * UnitPrice`.

---

## 5. Analytics Engines and Methodologies

### 5.1 RFM Segmentation Engine
Customers are evaluated across three dimensions based on the cleaned transaction history:
- Recency (R): Days elapsed between the customer's last order date and the dataset snapshot date (lower days = higher engagement).
- Frequency (F): Total count of distinct invoices placed by the customer.
- Monetary (M): Net revenue (Gross purchases minus returns) contributed by the customer.

Each dimension is binned into quintiles (scores 1 through 5). Composite rules assign customers to strategic segments:
- Champions: High recency (4-5), high frequency (4-5), high monetary spend (4-5).
- Loyal: Regular buyers with consistent purchasing cadence and above-average lifetime value.
- Promising: Recent purchasers with moderate order frequency.
- New: Recent first-time buyers with single transaction history.
- At-Risk: Formerly frequent high-spenders who have not purchased in over 90 to 180 days.
- Lost: Dormant customers with no activity for over 180 days and low historical spend.

### 5.2 Cohort Retention and Longevity Matrix
Customers are grouped into monthly acquisition cohorts based on the date of their first purchase. Subsequent purchase activity in months M+0, M+1, ..., M+12 is tracked:
- Customer Retention Percentage: Ratio of unique cohort members purchasing in Month M+k to total initial cohort size in Month M+0.
- Revenue Retention Percentage: Ratio of net spend generated in Month M+k to Month M+0 gross turnover.

### 5.3 Returns Intelligence and Revenue Leakage
Calculates product-level, segment-level, and monthly return metrics:
- Return Rate Formula: `Total Returned Value / Gross Sales Value`.
- Flagging Rule: Any SKU, segment, or month exceeding the portfolio average return rate by more than 1.0 standard deviation is highlighted for remediation.

### 5.4 Daily Demand Anomaly Detection
Applies a 30-day rolling Gaussian window to daily sales volumes:
- Z-Score Formula: `z = (Daily Sales - Rolling Mean) / Rolling Standard Deviation`.
- Thresholds: Days with absolute z-scores exceeding 2.0 are flagged as operational demand anomalies (spikes or drops).
- Root-Cause Attribution: Identifies the specific CustomerIDs and SKUs driving the anomaly on that date.

### 5.5 Multi-Factor Churn Risk Engine
Computes a weighted composite index from 0 to 100 for every active customer:
- Factor 1 (RFM Decay): Recency lag relative to the segment benchmark.
- Factor 2 (Return Propensity): Individual customer return rate vs portfolio benchmark.
- Factor 3 (Inter-Purchase Gap Acceleration): Expansion in days between consecutive orders.
- Factor 4 (Demand Volatility): Exposure to flagged demand anomaly dates.

### 5.6 Cross-Dataset Compare Engine
Benchmarks two retail datasets side by side:
- Scale Normalization: Re-scales datasets with different reporting units (e.g. thousands vs raw currency units) to avoid compressed zero-line artifacts.
- Category Alignment: Aligns timeline series and RFM segment distributions to compute relative growth trajectories and migration patterns.

---

## 6. Visualizations and Graph Guide

Every chart in SalesLens is engineered with complete legends, responsive grid padding, explicit axis titles, and analytical explanation callouts:

| Page / Tab | Graph Title | Chart Type | Legend Elements | Executive Explanation |
|---|---|---|---|---|
| Compare | Monthly Sales Growth Trajectory | Dual-line chart | Current Dataset, Baseline Dataset | Tracks normalized monthly gross turnover against a benchmark period to highlight seasonal variances and trajectory shifts. |
| Compare | Customer Segment Migration | Grouped dual-bar chart | Current Dataset, Baseline Dataset | Contrasts customer counts across RFM segments to identify cohort migration from high-value tiers to at-risk tiers. |
| Overview | Monthly Sales & Returns Breakdown | Combined bar and line chart | Gross Sales, Returns Incurred, Return Rate % | Compares monthly gross revenue bars against return deductions, overlaying net return percentage to detect seasonal leakage. |
| Overview | Customer Segment Value Mix | Donut pie chart | Champions, Loyal, Promising, New, At-Risk, Lost | Illustrates relative distribution of customer volume across segments, highlighting reliance on top-tier buyers. |
| Overview | Revenue Leakage Waterfall | Step waterfall bar chart | Gross Inflow, SKU Returns, Segment Leakage, Net Revenue | Quantifies deductions between initial gross order volume and final retained cash flow. |
| Anomalies | Daily Revenue & Statistical Z-Score | Dual-axis line and bar chart | Daily Gross Sales, Statistical Z-Score, Threshold (+/-2.0) | Plots daily sales against statistical boundaries to isolate flash sales, bulk orders, or fulfillment outages. |
| Products | Top 10 Revenue-Generating SKUs | Stacked horizontal bar chart | Net Retained Revenue, Returned Value | Ranks best-performing catalog items, highlighting products where high gross sales are undermined by high return volumes. |
| Products | Return Rate vs Repeat Attach Rate | Four-quadrant scatter plot | Core Drivers, Volume Leakers, Low Friction, Problem SKUs | Maps products by return risk and repurchase frequency to guide inventory rationalization. |
| Cohorts | Customer Longevity Retention Curves | Multi-line decay chart | Individual cohort monthly curves (Dec, Jan, Feb...) | Displays retention decay over time to verify whether onboarding improvements increase repeat order longevity. |
| Journey | Order Frequency Distribution | Histogram bar chart | Customer Frequency Count | Visualizes the distribution of total lifetime orders per customer to diagnose single-purchase drop-off. |
| Journey | Purchase Interval Distribution | Histogram bar chart | Order Gap (Days) | Analyzes the elapsed time between consecutive purchases to establish optimal marketing re-engagement cadences. |
| Journey | Revenue Concentration (Lorenz Curve) | Area line chart | Actual Lorenz Curve, Line of Perfect Equality | Demonstrates Pareto revenue concentration across the customer portfolio (e.g., top 20% driving 80% of revenue). |
| Journey | Monthly Customer Acquisition Pace | Gradient bar chart | Newly Acquired Customers | Tracks monthly customer acquisition volume to evaluate marketing campaign efficiency. |
| Risk | Churn Risk Score Distribution | Histogram bar chart | Customer Count by Risk Decile | Bins customer base into risk deciles from Minimal (0-20) to Critical (80-100). |
| Risk | Average Risk Score by RFM Segment | Horizontal bar chart | Average Risk Score (0-100) | Compares risk concentration across segments to identify early churn signals in Promising and Loyal cohorts. |
| Returns | Return Rate by Key Dimension | Bar chart with dashed benchmark | Return Rate %, Portfolio Average Benchmark | Evaluates return percentages across SKUs, segments, or months against the portfolio average. |
| Returns | Segment Share of Sales vs Returns | Dual-bar comparative chart | Share of Sales %, Share of Returns % | Compares revenue contribution against return liability to isolate segments generating disproportionate operational costs. |
| Returns | Monthly Return Rate Trajectory | Line chart with benchmark | Monthly Return Rate %, Portfolio Average | Tracks return rate fluctuations over the operational calendar. |
| Segments | RFM Customer Clustering Map | Multi-dimensional scatter plot | 6 RFM Segment Color Markers (Bubble size = Spend) | Displays customer clusters by Recency and Frequency with bubble size scaled by monetary spend. |

---

## 7. 5-Page Executive PDF Report Engine

SalesLens features a client-side vector PDF generator (`frontend/src/lib/pdf-report.ts`) that compiles a 5-page executive report:

- Page 1: Executive KPI Scorecard and Portfolio Health Breakdown
  Features corporate letterhead, dynamic generation metadata, 6 primary KPI metric tiles (Net Revenue, Gross Turnover, Return Volume, Customer Count, Repeat Purchase Rate, Indicative Churn Rate), data hygiene summary table, and portfolio revenue retention observations.
- Page 2: RFM Customer Segmentation and Cohort Longevity Analysis
  Contains a complete RFM segment distribution table (customer counts, cohort percentages, revenue share, and engagement definitions) alongside cohort longevity decay benchmarks.
- Page 3: Churn Risk Watchlist and Intervention Priorities
  Summarizes aggregate capital exposed to churn, breakdown of customers in High and Critical risk bands, and an executive watchlist table ranking the top at-risk accounts by monetary exposure with primary risk drivers.
- Page 4: Product Catalog Diagnostics and Return Leakage Intelligence
  Presents a top 10 revenue-generating SKU analysis (gross sales, return rate, net captured revenue) alongside an inventory leakage table identifying high-return catalog lines requiring supplier QA audits.
- Page 5: Demand Anomalies Timeline and 90-Day Executive Strategic Roadmap
  Details significant daily demand anomalies (|z| > 2.0) with operational drivers, followed by a structured 3-phase strategic roadmap (Days 1-30: Immediate Revenue Protection; Days 31-60: Retention and Segmentation Optimization; Days 61-90: Catalog and Operations Engineering).

---

## 8. Database and Storage Cleanup Engine

To prevent storage exhaustion and database bloat when testing or analyzing multiple transaction logs:

- Atomic Cascade Deletion: Deleting a dataset via `DELETE /api/v1/datasets/{id}` removes the master `DatasetModel` and automatically cascades deletions across all 10 child tables (`dashboard_kpis`, `monthly_trends`, `daily_sales`, `customer_journey`, `rfm_segments`, `cohort_retention`, `returns_intelligence`, `product_contribution`, `demand_anomalies`, `customer_risk`).
- Storage Purge Engine: The `POST /api/v1/datasets/clear` endpoint removes all persisted database records, resets active memory state, and sweeps `backend/storage/` to delete cached `.xlsx` and `.csv` files, reclaiming disk space.
- Interactive User Controls: The "Recent datasets" card on the Upload page provides a "Clear All Datasets" action in the header and individual "Delete" buttons for each stored dataset row.

---

## 9. Inventory of Obsolete and Unnecessary Files

The following files and directories in the repository are obsolete, temporary, or redundant and can be removed during project maintenance:

| File / Path | Size | Rationale for Removal |
|---|---|---|
| `.v0src/` | 154 KB | Legacy static HTML mockup directory from initial prototyping; completely superseded by the React frontend. |
| `Command.txt` | 77 bytes | Temporary developer launch scratchpad containing dev commands already codified in this documentation. |
| `analytics/` (root) | 0 bytes | Empty placeholder directory at repository root; active analytics logic resides in `backend/app/analytics/`. |
| `frontend/public/saleslens-frontend.zip` | 55 KB | Outdated zip archive in the static assets folder that needlessly bloats production distribution builds. |
| `frontend/dist/saleslens-frontend.zip` | 55 KB | Generated artifact copied from `frontend/public/` during Vite build. |
| `frontend/src/features/pipeline/PipelinePage.tsx` | 6.2 KB | Data Pipeline view removed from application navigation; cleaning and health metrics are now integrated directly into Upload and Overview. |
| `backend/storage/*.xlsx` and `*.csv` | > 1.0 GB | 149 temporary upload and cleaned transaction files accumulated during previous processing runs; safe to purge via the storage cleanup button. |
| `backend/.pytest_cache/` | Varies | Cache directory generated by automated test runners; should be managed via `.gitignore`. |
| `backend/**/__pycache__/` | Varies | Compiled Python bytecode cache files; should be excluded from version control. |

---

## 10. REST API Specification

All backend endpoints are prefixed with `/api/v1`. Interactive Swagger documentation is available at `http://localhost:8000/docs`.

### Dataset Management
- `POST /api/v1/datasets/upload`
  Uploads a CSV or Excel transaction file. Processing begins immediately in an asynchronous worker thread.
- `GET /api/v1/datasets/status`
  Returns current ingestion status: `idle`, `processing`, `ready`, or `failed`, with data hygiene summaries.
- `GET /api/v1/datasets`
  Returns a list of all stored datasets from PostgreSQL with metadata (row count, upload timestamp, active flag).
- `GET /api/v1/datasets/{dataset_id}`
  Fetches full analytics schema for a specific dataset ID or demo fallback.
- `DELETE /api/v1/datasets/{dataset_id}`
  Deletes the specified dataset and cascades deletion across all associated relational records.
- `POST /api/v1/datasets/clear`
  Purges all stored datasets from the database, deletes cached files in `backend/storage/`, and resets memory state.

### Analytics Endpoints
- `GET /api/v1/datasets/overview`
  Returns portfolio KPIs, monthly revenue trends, segment distributions, and executive narrative insights.
- `GET /api/v1/datasets/report-data`
  Provides server-side joined data structures for the 5-page PDF report generator.
- `GET /api/v1/datasets/journey?page=1&page_size=50&sort_by=TotalRevenue&order=desc`
  Paginated customer journey records with order counts, lifetime revenue, and purchase intervals.
- `GET /api/v1/datasets/segments?page=1&page_size=100&segment=Champions`
  Paginated RFM customer scores and cluster groupings.
- `GET /api/v1/datasets/cohorts`
  Returns the complete 13x13 monthly cohort retention matrix for volume and net revenue.
- `GET /api/v1/datasets/returns?keyType=SKU&flaggedOnly=false`
  Returns leakage analysis grouped by SKU, segment, or calendar month.
- `GET /api/v1/datasets/products?page=1&page_size=100&search=HEART`
  Product catalog performance including unit volumes, gross turnover, return rates, and repeat attach rates.
- `GET /api/v1/datasets/anomalies?method=rolling&flaggedOnly=false`
  Daily time-series with rolling mean, standard deviation, z-score, and affected customer IDs.
- `GET /api/v1/datasets/risk?page=1&page_size=100&band=Critical`
  Customer churn risk scores with custom factor weight overrides.
- `GET /api/v1/datasets/customers/{customer_id}`
  Customer 360 view with complete transaction history, RFM profile, and individual return records.
- `GET /api/v1/datasets/export/{table}.csv`
  Streams analytical tables (`rfm`, `risk`, `journey`, `products`, `anomalies`, `returns`) as downloadable CSV files.
- `GET /api/v1/datasets/cleaned-file`
  Downloads the cleaned transaction Excel file with `Sales` and `Returns` split worksheets.

---

## 11. Installation and Setup Guide

### 11.1 Prerequisites
- Node.js: Version 18.0.0 or higher
- Python: Version 3.10 or higher
- PostgreSQL: Version 14 or higher (optional, fallback in-memory cache is built-in)
- Git

### 11.2 Environment Configuration
Create a `.env` file in the project root (reference `.env.example`):

```bash
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saleslens_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# API Service Configuration
API_PORT=8000
API_HOST=127.0.0.1
```

### 11.3 Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd c:\Users\harsh\SalesLens\backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Initialize the PostgreSQL database schema:
   ```bash
   python scripts/init_db.py
   ```
5. Launch the backend API server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

### 11.4 Frontend Setup
1. Open a separate terminal and navigate to the frontend directory:
   ```bash
   cd c:\Users\harsh\SalesLens\frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web application at `http://localhost:3000`.

### 11.5 Production Build Verification
To compile and validate the TypeScript frontend bundle:
```bash
cd c:\Users\harsh\SalesLens\frontend
npm run build
```

---

## 12. License

This project is licensed under the MIT License.
