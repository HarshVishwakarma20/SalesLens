import os
import sys
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Omit header and footer on cover page (page 1)
        if self._pageNumber > 1:
            # Header
            self.drawString(54, 755, "Acuity | Enterprise Customer & Retail Analytics Platform — Technical Project Report")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 747, 558, 747)
            
            # Footer
            self.line(54, 45, 558, 45)
            self.drawString(54, 32, "Confidential — Mini Project Final Technical Documentation & Reference Specification")
            page_text = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(558, 32, page_text)
            
        self.restoreState()

def build_pdf(filename="Acuity_Complete_Project_Specification_Report.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Palettes
    c_primary = colors.HexColor("#0F172A")    # Slate 900
    c_secondary = colors.HexColor("#0369A1")  # Sky 700
    c_teal = colors.HexColor("#0D9488")       # Teal 600
    c_dark = colors.HexColor("#1E293B")       # Slate 800
    c_text = colors.HexColor("#334155")       # Slate 700
    c_bg_light = colors.HexColor("#F8FAFC")   # Slate 50
    c_border = colors.HexColor("#E2E8F0")     # Slate 200

    # Typography Styles
    styles.add(ParagraphStyle(
        name="DocTitle",
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=c_primary,
        alignment=0,
        spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        name="DocSubtitle",
        fontName="Helvetica",
        fontSize=12,
        leading=16,
        textColor=c_secondary,
        alignment=0,
        spaceAfter=15
    ))
    styles.add(ParagraphStyle(
        name="MetaText",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=15
    ))
    styles.add(ParagraphStyle(
        name="SecHeading",
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name="SubSecHeading",
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=c_secondary,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name="BodyNormal",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=c_text,
        spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        name="BodyBold",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=c_dark,
        spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        name="CodeSnippet",
        fontName="Courier",
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        name="BulletItem",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=c_text,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    ))
    styles.add(ParagraphStyle(
        name="TableHead",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=0
    ))
    styles.add(ParagraphStyle(
        name="TableCell",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=c_dark
    ))
    styles.add(ParagraphStyle(
        name="TableCellBold",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=c_primary
    ))
    styles.add(ParagraphStyle(
        name="TableCellCode",
        fontName="Courier",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0369A1")
    ))

    story = []

    def p(text, style_name="BodyNormal"):
        return Paragraph(text, styles[style_name])

    def hr():
        return HRFlowable(width="100%", thickness=0.75, color=c_border, spaceBefore=6, spaceAfter=8)

    # =========================================================================
    # COVER / TITLE BLOCK
    # =========================================================================
    story.append(p("Acuity: Customer Intelligence & Retail Diagnostics Platform", "DocTitle"))
    story.append(p("Comprehensive Technical Architecture, Frontend, Backend Logic, REST APIs & Database Specification", "DocSubtitle"))
    story.append(p(f"Complete Technical Reference Guide for Academic Mini Project Final Report | Generated: {datetime.now().strftime('%B %d, %Y')}", "MetaText"))
    story.append(hr())
    story.append(Spacer(1, 4))

    # Executive Summary Card
    exec_text = (
        "<b>Executive Purpose:</b> This comprehensive reference document specifies the complete technical architecture, data pipelines, "
        "relational schemas, statistical formulations, and user interface systems implemented in <b>Acuity</b>. "
        "Acuity is an enterprise customer intelligence and retail revenue diagnostics platform. It ingests multi-megabyte retail transaction "
        "logs (such as the UCI Online Retail benchmark dataset), applies an automated 7-stage deterministic cleaning pipeline, computes "
        "multi-dimensional customer behavioral metrics (RFM Quintiles, Cohort Retention Matrices, Value-weighted Returns Leakage, Rolling Gaussian "
        "Anomaly Detection, Rule-Based Churn Risk Indices, and Inter-Purchase Gap Velocity), stores analytical entities in PostgreSQL with cascade "
        "integrity, and visualizes them on a modern, responsive React 18/TypeScript web dashboard with client-side 5-page executive PDF generation and full data export capabilities."
    )
    exec_table = Table([[Paragraph(exec_text, styles["BodyNormal"])]], colWidths=[504])
    exec_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#86EFAC")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(exec_table)
    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 1: TECHNOLOGY STACK & CORE HIGHLIGHTS
    # =========================================================================
    story.append(p("1. Complete Technology Stack & Specifications", "SecHeading"))
    story.append(hr())
    
    tech_data = [
        [Paragraph("Layer", styles["TableHead"]), Paragraph("Technology / Framework", styles["TableHead"]), Paragraph("Specific Version / Library", styles["TableHead"]), Paragraph("Role & Architecture Responsibilities", styles["TableHead"])],
        [Paragraph("Frontend UI", styles["TableCellBold"]), Paragraph("React 18 + TypeScript", styles["TableCell"]), Paragraph("React 18.3.1, TS 5.6", styles["TableCellCode"]), Paragraph("Single Page Application (SPA), component architecture, strict type definitions.", styles["TableCell"])],
        [Paragraph("Build Tool", styles["TableCellBold"]), Paragraph("Vite", styles["TableCell"]), Paragraph("Vite 6.0", styles["TableCellCode"]), Paragraph("Instant Hot Module Replacement (HMR), optimized production tree-shaken bundling.", styles["TableCell"])],
        [Paragraph("Styling System", styles["TableCellBold"]), Paragraph("Tailwind CSS v4 + Tokens", styles["TableCell"]), Paragraph("Tailwind 4.0, PostCSS", styles["TableCellCode"]), Paragraph("Dark mode enterprise design system, CSS variables, glassmorphic UI cards, tabular numbers.", styles["TableCell"])],
        [Paragraph("Visualizations", styles["TableCellBold"]), Paragraph("Apache ECharts 6", styles["TableCell"]), Paragraph("echarts-for-react 3.0", styles["TableCellCode"]), Paragraph("GPU-accelerated vector charting, dataZoom sliders, interactive multi-axis graphs.", styles["TableCell"])],
        [Paragraph("Client State", styles["TableCellBold"]), Paragraph("Zustand", styles["TableCell"]), Paragraph("zustand 5.0", styles["TableCellCode"]), Paragraph("Lightweight global reactive stores for dataset status, active filters, drawer toggles.", styles["TableCell"])],
        [Paragraph("Async Fetching", styles["TableCellBold"]), Paragraph("TanStack React Query", styles["TableCell"]), Paragraph("@tanstack/react-query v5", styles["TableCellCode"]), Paragraph("Automatic caching, background refetching, deduping API calls, loading states.", styles["TableCell"])],
        [Paragraph("Backend Core", styles["TableCellBold"]), Paragraph("Python FastAPI", styles["TableCell"]), Paragraph("FastAPI 0.143, Uvicorn 0.54", styles["TableCellCode"]), Paragraph("Asynchronous ASGI REST API, automatic OpenAPI / Swagger documentation, request guards.", styles["TableCell"])],
        [Paragraph("Analytics Core", styles["TableCellBold"]), Paragraph("Pandas + NumPy", styles["TableCell"]), Paragraph("Pandas 2.3, NumPy 2.4", styles["TableCellCode"]), Paragraph("High-speed vectorized array transformations, percentile ranking, time-series aggregations.", styles["TableCell"])],
        [Paragraph("Statistical TS", styles["TableCellBold"]), Paragraph("Statsmodels (Optional)", styles["TableCell"]), Paragraph("statsmodels 0.15", styles["TableCellCode"]), Paragraph("STL (Seasonal and Trend decomposition using Loess) decomposition for weekly seasonality.", styles["TableCell"])],
        [Paragraph("Database ORM", styles["TableCellBold"]), Paragraph("PostgreSQL + SQLAlchemy", styles["TableCell"]), Paragraph("SQLAlchemy 2.1, Psycopg2", styles["TableCellCode"]), Paragraph("Relational persistence, atomic transactions, foreign keys, cascade delete orphans.", styles["TableCell"])],
        [Paragraph("PDF Generator", styles["TableCellBold"]), Paragraph("jsPDF + AutoTable", styles["TableCell"]), Paragraph("jspdf 4.0, autotable 5.0", styles["TableCellCode"]), Paragraph("Client-side vector generation of 5-page executive board report with charts and scorecards.", styles["TableCell"])],
        [Paragraph("File IO & Export", styles["TableCellBold"]), Paragraph("OpenPyXL + CSV Stream", styles["TableCell"]), Paragraph("openpyxl 3.1.5", styles["TableCellCode"]), Paragraph("Parsing multi-MB Excel sheets, streaming CSV downloads, formatted clean Excel output.", styles["TableCell"])],
        [Paragraph("Testing Suite", styles["TableCellBold"]), Paragraph("Pytest + SQLite In-Memory", styles["TableCell"]), Paragraph("pytest 9.1, pytest-asyncio", styles["TableCellCode"]), Paragraph("Unit and integration tests for data cleaning, analytics math, API routes, DB schemas.", styles["TableCell"])],
    ]
    t_tech = Table(tech_data, colWidths=[70, 110, 100, 224])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 12))

    # =========================================================================
    # SECTION 2: ARCHITECTURE & DATA FLOW
    # =========================================================================
    story.append(p("2. System Architecture & Dual-State Processing Model", "SecHeading"))
    story.append(hr())
    story.append(p(
        "Acuity uses an asynchronous decoupled architecture designed for sub-second user responsiveness. "
        "Traditional web architectures often block the HTTP request while persisting large relational datasets, causing timeouts on 500k+ row spreadsheets. "
        "Acuity eliminates this bottleneck using a dual-state pipeline:",
        "BodyNormal"
    ))
    story.append(p("<b>1. Immediate In-Memory Analytics (Sub-Second Dashboard Readiness):</b> When a file is uploaded, the FastAPI backend immediately validates and cleans the data using vectorized Pandas routines. All 8 analytics engines execute in an isolated background thread managed by <code>ThreadPoolExecutor(max_workers=1)</code>. The thread writes results into the thread-safe in-memory <code>State</code> singleton. As soon as in-memory state is ready, the frontend polling loop switches status to 'ready' and instantly renders all dashboards.", "BulletItem"))
    story.append(p("<b>2. Asynchronous Database Persistence:</b> Concurrently, a secondary background daemon persists all datasets, KPI records, monthly trends, RFM scores, cohort matrices, and customer risk entities into PostgreSQL inside an atomic database transaction. If the database is offline or temporarily unavailable, the system transparently operates on in-memory cache without crashing.", "BulletItem"))
    story.append(p("<b>3. Cold-Start Hydration:</b> When the backend service restarts, the API checks PostgreSQL for the most recently active dataset and rehydrates the dashboard overview metrics, ensuring data persistence across server restarts.", "BulletItem"))
    story.append(p("<b>4. Generation Counter (Concurrency Safety):</b> Each upload increments an atomic generation integer (<code>state.generation</code>). If a user uploads a new dataset while a previous upload is computing, the older pipeline aborts immediately, preventing race conditions or state pollution.", "BulletItem"))
    story.append(Spacer(1, 8))

    # Architecture Box
    arch_flow = (
        "<b>DATA FLOW LIFECYCLE:</b><br/>"
        "[Browser Upload: CSV / XLSX / Parquet]  ──>  [FastAPI Gateway: /api/v1/datasets/upload]<br/>"
        "                                                   │<br/>"
        "                                                   ▼<br/>"
        "                             [7-Stage Deterministic Cleaning Engine (cleaning.py)]<br/>"
        "                                                   │<br/>"
        "                                                   ▼<br/>"
        "                             [Vectorized Analytics Core Pipeline (_run_pipeline)]<br/>"
        "                                       ┌───────────┴───────────┐<br/>"
        "                                       ▼                       ▼<br/>"
        "                         [In-Memory State (state.py)]    [Async Thread: PostgreSQL Persistence]<br/>"
        "                                 status = 'ready'               11 Relational Tables (models.py)<br/>"
        "                                       │<br/>"
        "                                       ▼<br/>"
        "                         [React Frontend UI & 5-Page Board PDF Generator]"
    )
    t_arch = Table([[Paragraph(arch_flow, styles["CodeSnippet"])]], colWidths=[504])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 3: REPOSITORY DIRECTORY & FILE TREE
    # =========================================================================
    story.append(p("3. Complete Codebase Directory & File Structure", "SecHeading"))
    story.append(hr())
    story.append(p("The project is organized into a Python FastAPI backend service and a React 18/TypeScript frontend client. The following table details every critical file, configuration, and module:", "BodyNormal"))

    tree_rows = [
        [Paragraph("File / Directory Path", styles["TableHead"]), Paragraph("Subsystem", styles["TableHead"]), Paragraph("Detailed Role, Contents & Architecture Purpose", styles["TableHead"])],
        [Paragraph(".env", styles["TableCellCode"]), Paragraph("Environment", styles["TableCellBold"]), Paragraph("Root configuration containing database host, port, user credentials, and API environment variables.", styles["TableCell"])],
        [Paragraph("README.md", styles["TableCellCode"]), Paragraph("Documentation", styles["TableCellBold"]), Paragraph("Comprehensive project overview, quick-start setup guide, technology stack table, and architecture diagrams.", styles["TableCell"])],
        [Paragraph("package.json", styles["TableCellCode"]), Paragraph("Project Root", styles["TableCellBold"]), Paragraph("Monorepo root package configuration facilitating concurrent workspace scripting.", styles["TableCell"])],
        [Paragraph("backend/requirements.txt", styles["TableCellCode"]), Paragraph("Backend Core", styles["TableCellBold"]), Paragraph("Defines production Python dependencies: FastAPI, Uvicorn, Pandas, NumPy, SQLAlchemy, Psycopg2, OpenPyXL, etc.", styles["TableCell"])],
        [Paragraph("backend/storage/", styles["TableCellCode"]), Paragraph("Backend Storage", styles["TableCellBold"]), Paragraph("Automated filesystem cache where uploaded raw CSVs and processed Excel workbooks (.xlsx) are persisted.", styles["TableCell"])],
        [Paragraph("backend/scripts/init_db.py", styles["TableCellCode"]), Paragraph("Backend DB Init", styles["TableCellBold"]), Paragraph("Standalone schema initialization script that compiles all 11 SQLAlchemy models into PostgreSQL.", styles["TableCell"])],
        [Paragraph("backend/tests/conftest.py", styles["TableCellCode"]), Paragraph("Testing Suite", styles["TableCellBold"]), Paragraph("Shared Pytest fixtures, test database engine setup, and synthetic transaction generators.", styles["TableCell"])],
        [Paragraph("backend/tests/test_cleaning.py", styles["TableCellCode"]), Paragraph("Testing Suite", styles["TableCellBold"]), Paragraph("Unit tests validating header aliasing, deduplication, CustomerID presence, and cancellation pairing.", styles["TableCell"])],
        [Paragraph("backend/tests/test_analytics.py", styles["TableCellCode"]), Paragraph("Testing Suite", styles["TableCellBold"]), Paragraph("Mathematical tests verifying RFM percentiles, cohort retention matrices, rolling z-scores, and risk scores.", styles["TableCell"])],
        [Paragraph("backend/tests/test_api.py", styles["TableCellCode"]), Paragraph("Testing Suite", styles["TableCellBold"]), Paragraph("FastAPI endpoint integration tests verifying JSON contracts, query filters, and CSV export headers.", styles["TableCell"])],
        [Paragraph("backend/tests/test_database.py", styles["TableCellCode"]), Paragraph("Testing Suite", styles["TableCellBold"]), Paragraph("ORM cascade tests confirming that deleting a dataset automatically wipes child records with zero orphans.", styles["TableCell"])],
        [Paragraph("backend/app/main.py", styles["TableCellCode"]), Paragraph("Backend Core", styles["TableCellBold"]), Paragraph("FastAPI application entry point; configures CORS middleware and mounts all routes at /api/v1.", styles["TableCell"])],
        [Paragraph("backend/app/config.py", styles["TableCellCode"]), Paragraph("Backend Core", styles["TableCellBold"]), Paragraph("Central settings; builds PostgreSQL connection URL; defines RFM weights, risk weights, anomaly thresholds.", styles["TableCell"])],
        [Paragraph("backend/app/database.py", styles["TableCellCode"]), Paragraph("Database Layer", styles["TableCellBold"]), Paragraph("SQLAlchemy engine, session factory, Base declarative class, and active connection diagnostic probe.", styles["TableCell"])],
        [Paragraph("backend/app/models.py", styles["TableCellCode"]), Paragraph("Database Layer", styles["TableCellBold"]), Paragraph("11 Relational ORM schemas with cascading delete integrity and indexes across IDs, dates, and segments.", styles["TableCell"])],
        [Paragraph("backend/app/schemas.py", styles["TableCellCode"]), Paragraph("Backend Core", styles["TableCellBold"]), Paragraph("Pydantic models for request validation (e.g. RiskWeightParams) and structured API response bodies.", styles["TableCell"])],
        [Paragraph("backend/app/cleaning.py", styles["TableCellCode"]), Paragraph("Analytics Engine", styles["TableCellBold"]), Paragraph("7-stage deterministic cleaning pipeline: standardizes columns, strips charges, pairs returns, splits datasets.", styles["TableCell"])],
        [Paragraph("backend/app/routes.py", styles["TableCellCode"]), Paragraph("API Layer", styles["TableCellBold"]), Paragraph("All 19+ REST API route handlers, pagination helpers, customer 360 view, and streaming CSV/Excel exports.", styles["TableCell"])],
        [Paragraph("backend/app/services.py", styles["TableCellCode"]), Paragraph("Orchestration", styles["TableCellBold"]), Paragraph("Manages upload pipeline execution in background threads; tracks generation counters to prevent race conditions.", styles["TableCell"])],
        [Paragraph("backend/app/db_service.py", styles["TableCellCode"]), Paragraph("Database Layer", styles["TableCellBold"]), Paragraph("Executes atomic PostgreSQL transactions, sanitizes NaN/Inf values, and performs dataset queries.", styles["TableCell"])],
        [Paragraph("backend/app/state.py", styles["TableCellCode"]), Paragraph("State Layer", styles["TableCellBold"]), Paragraph("Singleton in-memory state caching active DataFrames, KPIs, and computation status for sub-second responses.", styles["TableCell"])],
        [Paragraph("backend/app/utils.py", styles["TableCellCode"]), Paragraph("Utilities", styles["TableCellBold"]), Paragraph("Generic pagination utility (paginate) and recursive NaN/Inf to None sanitizer (sanitize).", styles["TableCell"])],
        [Paragraph("backend/app/analytics/kpis.py", styles["TableCellCode"]), Paragraph("Analytics Core", styles["TableCellBold"]), Paragraph("Calculates 9 headline KPIs, monthly sales trends, daily revenue, and narrative portfolio insights.", styles["TableCell"])],
        [Paragraph("backend/app/analytics/rfm.py", styles["TableCellCode"]), Paragraph("Analytics Core", styles["TableCellBold"]), Paragraph("Computes Recency, Frequency, Monetary metrics; assigns 1-5 quintiles; classifies into 6 lifecycle segments.", styles["TableCell"])],
        [Paragraph("backend/app/analytics/cohorts.py", styles["TableCellCode"]), Paragraph("Analytics Core", styles["TableCellBold"]), Paragraph("Builds 13-month triangle acquisition matrix tracking customer counts and revenue retention curves.", styles["TableCell"])],
        [Paragraph("backend/app/analytics/returns.py", styles["TableCellCode"]), Paragraph("Analytics Core", styles["TableCellBold"]), Paragraph("Calculates return leakage by SKU, Segment, and Month against portfolio benchmark averages.", styles["TableCell"])],
        [Paragraph("backend/app/analytics/anomalies.py", styles["TableCellCode"]), Paragraph("Analytics Core", styles["TableCellBold"]), Paragraph("Detects daily sales shocks using 30-day rolling Gaussian z-scores (|z| > 2.0) and attributes affected buyers.", styles["TableCell"])],
        [Paragraph("backend/app/analytics/risk.py", styles["TableCellCode"]), Paragraph("Analytics Core", styles["TableCellBold"]), Paragraph("Rule-based composite 0-100 churn risk scoring combining RFM decay, returns, and gap widening.", styles["TableCell"])],
        [Paragraph("backend/app/analytics/journey.py", styles["TableCellCode"]), Paragraph("Analytics Core", styles["TableCellBold"]), Paragraph("Computes order frequency, lifetime revenue, average inter-purchase gaps, and linear gap slopes.", styles["TableCell"])],
        [Paragraph("backend/app/analytics/products.py", styles["TableCellCode"]), Paragraph("Analytics Core", styles["TableCellBold"]), Paragraph("Computes SKU return rates, repeat attach rates, and 4-quadrant matrix classification (Stars, etc.).", styles["TableCell"])],
        [Paragraph("frontend/package.json", styles["TableCellCode"]), Paragraph("Frontend Config", styles["TableCellBold"]), Paragraph("Declares dependencies: React 18, Vite, Tailwind CSS v4, Apache ECharts, Zustand, jsPDF, Lucide icons.", styles["TableCell"])],
        [Paragraph("frontend/vite.config.ts", styles["TableCellCode"]), Paragraph("Build System", styles["TableCellBold"]), Paragraph("Vite config defining path aliases (@/ -> src/) and reverse-proxying /api to FastAPI at port 8000.", styles["TableCell"])],
        [Paragraph("frontend/src/main.tsx", styles["TableCellCode"]), Paragraph("Frontend Entry", styles["TableCellBold"]), Paragraph("React application root mounting QueryClientProvider and Toaster into document DOM.", styles["TableCell"])],
        [Paragraph("frontend/src/app/router.tsx", styles["TableCellCode"]), Paragraph("Routing System", styles["TableCellBold"]), Paragraph("React Router v6 browser router definitions mapping all 14 feature routes under AppShell.", styles["TableCell"])],
        [Paragraph("frontend/src/app/nav.ts", styles["TableCellCode"]), Paragraph("Navigation", styles["TableCellBold"]), Paragraph("Sidebar navigation registry defining primary routes, secondary routes, icons, and page descriptions.", styles["TableCell"])],
        [Paragraph("frontend/src/app/layout/AppShell.tsx", styles["TableCellCode"]), Paragraph("Layout System", styles["TableCellBold"]), Paragraph("Root responsive layout frame containing Sidebar, Topbar, main Outlet, and MobileTabBar.", styles["TableCell"])],
        [Paragraph("frontend/src/components/kpi/", styles["TableCellCode"]), Paragraph("UI Library", styles["TableCellBold"]), Paragraph("KpiCard and KpiGrid components rendering headline metrics, sparklines, and delta chips.", styles["TableCell"])],
        [Paragraph("frontend/src/components/charts/", styles["TableCellCode"]), Paragraph("Visualization", styles["TableCellBold"]), Paragraph("ECharts wrapper, MonthlySalesChart, SegmentDonut, LeakageWaterfall, and ZoomSlider controls.", styles["TableCell"])],
        [Paragraph("frontend/src/components/tables/", styles["TableCellCode"]), Paragraph("UI Library", styles["TableCellBold"]), Paragraph("Reusable, accessible, paginated DataTable component with sortable headers and custom cell renderers.", styles["TableCell"])],
        [Paragraph("frontend/src/features/upload/", styles["TableCellCode"]), Paragraph("Feature Module", styles["TableCellBold"]), Paragraph("DataSourcePage, UploadCard (Cleaned vs Raw dropzones), ValidationPanel, and RecentDatasets table.", styles["TableCell"])],
        [Paragraph("frontend/src/features/overview/", styles["TableCellCode"]), Paragraph("Feature Module", styles["TableCellBold"]), Paragraph("Executive Overview dashboard displaying KPI grid, monthly trend panels, segment mix, and leakage.", styles["TableCell"])],
        [Paragraph("frontend/src/features/compare/", styles["TableCellCode"]), Paragraph("Feature Module", styles["TableCellBold"]), Paragraph("Side-by-side benchmarking page comparing active upload against historical Q3 baseline periods.", styles["TableCell"])],
        [Paragraph("frontend/src/features/journey/", styles["TableCellCode"]), Paragraph("Feature Module", styles["TableCellBold"]), Paragraph("Customer Journey analysis with purchase interval distributions, Lorenz curve, and buyer table.", styles["TableCell"])],
        [Paragraph("frontend/src/features/segments/", styles["TableCellCode"]), Paragraph("Feature Module", styles["TableCellBold"]), Paragraph("RFM customer segmentation page with interactive 3D bubble scatter plot and segment rules card.", styles["TableCell"])],
        [Paragraph("frontend/src/features/cohorts/", styles["TableCellCode"]), Paragraph("Feature Module", styles["TableCellBold"]), Paragraph("13-Month acquisition cohort retention triangle heatmap and multi-cohort decay curves.", styles["TableCell"])],
        [Paragraph("frontend/src/features/returns/", styles["TableCellCode"]), Paragraph("Feature Module", styles["TableCellBold"]), Paragraph("Returns intelligence dashboard analyzing margin leakage across SKUs, segments, and months.", styles["TableCell"])],
        [Paragraph("frontend/src/features/products/", styles["TableCellCode"]), Paragraph("Feature Module", styles["TableCellBold"]), Paragraph("Product contribution matrix classifying catalog items into Stars, Loyalty Builders, and Long Tail.", styles["TableCell"])],
        [Paragraph("frontend/src/features/anomalies/", styles["TableCellCode"]), Paragraph("Feature Module", styles["TableCellBold"]), Paragraph("Demand anomalies view graphing daily revenue vs rolling z-score with affected account attribution.", styles["TableCell"])],
        [Paragraph("frontend/src/features/risk/", styles["TableCellCode"]), Paragraph("Feature Module", styles["TableCellBold"]), Paragraph("Customer churn risk radar featuring 4 dynamic factor weight sliders and high-risk account watchlist.", styles["TableCell"])],
        [Paragraph("frontend/src/features/simulator/", styles["TableCellCode"]), Paragraph("Feature Module", styles["TableCellBold"]), Paragraph("What-If marketing campaign simulator calculating step-by-step incremental revenue projections.", styles["TableCell"])],
        [Paragraph("frontend/src/features/methodology/", styles["TableCellCode"]), Paragraph("Feature Module", styles["TableCellBold"]), Paragraph("Mathematical documentation page providing formulas, worked examples, and metric definitions.", styles["TableCell"])],
        [Paragraph("frontend/src/features/mllab/", styles["TableCellCode"]), Paragraph("Feature Module", styles["TableCellBold"]), Paragraph("Machine Learning Lab showcasing planned predictive models (CLV, Churn classifier, Market Basket).", styles["TableCell"])],
        [Paragraph("frontend/src/stores/", styles["TableCellCode"]), Paragraph("State Stores", styles["TableCellBold"]), Paragraph("Zustand global stores: dataset.ts (polling status), filters.ts (active segments), ui.ts (drawer toggles).", styles["TableCell"])],
        [Paragraph("frontend/src/hooks/", styles["TableCellCode"]), Paragraph("Custom Hooks", styles["TableCellBold"]), Paragraph("React hooks: useDataset, useBackendData (TanStack Query wrappers for each analytics endpoint).", styles["TableCell"])],
        [Paragraph("frontend/src/lib/pdf-report.ts", styles["TableCellCode"]), Paragraph("Reporting Core", styles["TableCellBold"]), Paragraph("Client-side jsPDF reporting engine compiling 5-page board presentation with vector charts and tables.", styles["TableCell"])],
    ]
    t_tree = Table(tree_rows, colWidths=[120, 85, 299])
    t_tree.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_tree)
    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 4: 7-STAGE DATA CLEANING PIPELINE
    # =========================================================================
    story.append(p("4. Seven-Stage Deterministic Data Cleaning Pipeline", "SecHeading"))
    story.append(hr())
    story.append(p(
        "Real-world enterprise transaction logs contain missing customer identifiers, cancellations, shipping charges, "
        "currency symbol artifacts, and duplicated synchronization packets. The cleaning engine (<code>backend/app/cleaning.py</code>) "
        "implements a 7-stage deterministic pipeline. Detection is based on column names rather than file extensions or user flags.",
        "BodyNormal"
    ))

    cleaning_stages = [
        [Paragraph("Stage", styles["TableHead"]), Paragraph("Operation Name", styles["TableHead"]), Paragraph("Code Logic & Transformations", styles["TableHead"]), Paragraph("Purpose & Impact on Accuracy", styles["TableHead"])],
        [
            Paragraph("Stage 1", styles["TableCellBold"]),
            Paragraph("Header Normalization & Alias Mapping", styles["TableCellBold"]),
            Paragraph("Converts all column headers to lowercase, strips trailing spaces, drops duplicate columns, and maps synonyms (e.g. <code>client_id</code>, <code>customer_id</code> → <code>CustomerID</code>; <code>price</code>, <code>unit_price</code> → <code>UnitPrice</code>; <code>sku</code>, <code>item_code</code> → <code>StockCode</code>).", styles["TableCell"]),
            Paragraph("Guarantees schema compatibility across disparate ERP and POS exports without manual user renaming.", styles["TableCell"])
        ],
        [
            Paragraph("Stage 2", styles["TableCellBold"]),
            Paragraph("Deduplication", styles["TableCellBold"]),
            Paragraph("Executes <code>df.drop_duplicates()</code> across all columns simultaneously.", styles["TableCell"]),
            Paragraph("Removes multi-channel replication retries and double-counted checkout sync packets.", styles["TableCell"])
        ],
        [
            Paragraph("Stage 3", styles["TableCellBold"]),
            Paragraph("Type Sanitation & Parsing", styles["TableCellBold"]),
            Paragraph("Coerces <code>Quantity</code>, <code>UnitPrice</code>, and <code>CustomerID</code> to numeric formats using <code>pd.to_numeric(errors='coerce')</code>. Parses <code>InvoiceDate</code> into ISO datetime objects.", styles["TableCell"]),
            Paragraph("Eliminates corrupt alphanumeric numbers, negative prices, and bad date formatting.", styles["TableCell"])
        ],
        [
            Paragraph("Stage 4", styles["TableCellBold"]),
            Paragraph("Customer ID & Essential Validation", styles["TableCellBold"]),
            Paragraph("Purges rows where <code>CustomerID.isna()</code>. Drops rows missing essential transaction keys (<code>InvoiceNo</code>, <code>StockCode</code>, <code>Quantity</code>, <code>UnitPrice</code>, <code>InvoiceDate</code>). Fills missing descriptions and countries with 'Unknown'.", styles["TableCell"]),
            Paragraph("Anonymous guest checkouts skew customer RFM and retention tracking; purging them isolates verifiable customer accounts.", styles["TableCell"])
        ],
        [
            Paragraph("Stage 5", styles["TableCellBold"]),
            Paragraph("Non-Product Catalog Filtering", styles["TableCellBold"]),
            Paragraph("Identifies non-inventory transaction codes: <code>POST</code> (Postage), <code>DOT</code> (Dotcom postage), <code>M</code> (Manual), <code>S</code> (Sample), <code>AMAZONFEE</code>, <code>BANK CHARGES</code>, <code>C2</code> (Carriage), <code>D</code> (Discount), <code>CRUK</code> (Charity).", styles["TableCell"]),
            Paragraph("Prevents shipping fees and administrative banking charges from masquerading as physical merchandise sales.", styles["TableCell"])
        ],
        [
            Paragraph("Stage 6", styles["TableCellBold"]),
            Paragraph("Transaction Segregation & Cancellation Pairing", styles["TableCellBold"]),
            Paragraph("Rows where <code>InvoiceNo</code> starts with 'C' or <code>Quantity &lt; 0</code> are categorized as <code>RETURN/CANCELLATION</code>. All other rows are categorized as <code>SALE</code>.", styles["TableCell"]),
            Paragraph("Permits precise distinction between gross sales cash inflow and returned merchandise cash leakage.", styles["TableCell"])
        ],
        [
            Paragraph("Stage 7", styles["TableCellBold"]),
            Paragraph("Financial Metric Derivation & Dataset Split", styles["TableCellBold"]),
            Paragraph("Computes <code>TransactionValue = Quantity * UnitPrice</code>, <code>SalesValue</code>, <code>ReturnValue</code>, and <code>NetRevenue = SalesValue - ReturnValue</code>. Splits master dataset into <code>sales_df</code> and <code>returns_df</code>, each with positive <code>LineValue</code>.", styles["TableCell"]),
            Paragraph("Supplies normalized, pre-split tabular streams for all downstream analytics modules.", styles["TableCell"])
        ],
    ]
    t_clean = Table(cleaning_stages, colWidths=[48, 105, 205, 146])
    t_clean.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_clean)
    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 5: CORE ANALYTICS ENGINES & MATHEMATICAL FORMULATIONS
    # =========================================================================
    story.append(p("5. Core Analytics Engines & Mathematical Formulations", "SecHeading"))
    story.append(hr())
    story.append(p("Acuity implements transparent, deterministic statistical formulations without black-box machine learning. Every number displayed on the dashboard can be traced directly to an exact mathematical formula:", "BodyNormal"))

    # RFM Subsection
    story.append(p("5.1 RFM Customer Segmentation Engine (rfm.py)", "SubSecHeading"))
    story.append(p(
        "<b>Step 1 — Metric Aggregation:</b> For each customer <i>c</i> across sales transactions:<br/>"
        "• <i>Recency (R)</i> = <code>ref_date - max(InvoiceDate_c)</code> (in elapsed days, where <code>ref_date = max(InvoiceDate) + 1 day</code>)<br/>"
        "• <i>Frequency (F)</i> = <code>nunique(InvoiceNo_c)</code> (count of distinct invoices)<br/>"
        "• <i>Monetary (M)</i> = <code>sum(LineValue_c)</code> (total gross sales spend)",
        "BodyNormal"
    ))
    story.append(p(
        "<b>Step 2 — Quintile Scoring (1 to 5):</b> Customers are assigned scores 1 to 5 based on empirical percentile ranks:<br/>"
        "• <code>R_Score = ceil(rank_pct(Recency, ascending=False) * 5)</code> (Lower recency gets higher score 5)<br/>"
        "• <code>F_Score = ceil(rank_pct(Frequency, ascending=True) * 5)</code> (Higher frequency gets higher score 5)<br/>"
        "• <code>M_Score = ceil(rank_pct(Monetary, ascending=True) * 5)</code> (Higher spend gets higher score 5)<br/>"
        "• <code>RFM_Score = (R_Score * 0.40) + (F_Score * 0.30) + (M_Score * 0.30)</code>",
        "BodyNormal"
    ))
    story.append(p(
        "<b>Step 3 — Sequential Top-Down Classification:</b> A customer is categorized into the first matching segment:<br/>"
        "1. <b>Champion:</b> <code>R >= 4 AND F >= 4 AND M >= 4</code> (High recency, frequent buyers, top spenders)<br/>"
        "2. <b>Loyal:</b> <code>R >= 3 AND F >= 4</code> (Regular buyers with steady repeat cadence)<br/>"
        "3. <b>New:</b> <code>R >= 4 AND F <= 2</code> (Recent first-time purchasers requiring onboarding)<br/>"
        "4. <b>At-Risk:</b> <code>R <= 2 AND F >= 3</code> (Previously frequent buyers who have lapsed)<br/>"
        "5. <b>Lost:</b> <code>R <= 2 AND F <= 2</code> (Historical low-frequency buyers who have gone silent)<br/>"
        "6. <b>Promising:</b> Default fallback for all remaining buyer profiles",
        "BodyNormal"
    ))
    story.append(Spacer(1, 6))

    # Cohort Subsection
    story.append(p("5.2 Cohort Retention Matrix Engine (cohorts.py)", "SubSecHeading"))
    story.append(p(
        "Customers are assigned to an acquisition cohort based on their first purchase month: <code>CohortMonth = min(InvoiceDate_c).to_period('M')</code>.<br/>"
        "For each subsequent calendar month <i>m</i>, the elapsed index is: <code>MonthIndex = (Year_m - Year_cohort)*12 + (Month_m - Month_cohort)</code>.<br/>"
        "• <b>Customer Retention %:</b> <code>RetentionPct(c, i) = ActiveCustomers(c, i) / CohortSize(c, 0) * 100</code><br/>"
        "• <b>Revenue Retention %:</b> <code>RevenuePct(c, i) = Revenue(c, i) / Revenue(c, 0) * 100</code><br/>"
        "The resulting matrix forms a triangle heatmap spanning 13 months, highlighting acquisition quality and revenue decay curves.",
        "BodyNormal"
    ))
    story.append(Spacer(1, 6))

    # Returns Subsection
    story.append(p("5.3 Returns & Revenue Leakage Intelligence (returns.py)", "SubSecHeading"))
    story.append(p(
        "Evaluates cash leakage across three distinct operational dimensions: by StockCode (SKU), by Customer Segment, and by Calendar Month.<br/>"
        "• <b>Dimension Return Rate:</b> <code>ReturnRate_k = ReturnsValue_k / (SalesValue_k + ReturnsValue_k)</code><br/>"
        "• <b>Portfolio Average Benchmark:</b> <code>PortfolioAvg = sum(All_Returns) / (sum(All_Sales) + sum(All_Returns))</code><br/>"
        "• <b>Leakage Flagging Condition:</b> An entity is flagged for margin risk if <code>ReturnRate_k &gt; PortfolioAvg</code>.<br/>"
        "Also computes individual customer return propensity Series: <code>cust_return_rate = Returns_c / (Sales_c + Returns_c)</code> for downstream risk scoring.",
        "BodyNormal"
    ))
    story.append(Spacer(1, 6))

    # Anomalies Subsection
    story.append(p("5.4 Demand Anomaly Detection Engine (anomalies.py)", "SubSecHeading"))
    story.append(p(
        "Detects statistical shocks, demand spikes, flash sales, or operational dropouts in daily sales series <code>Sales(t)</code>:<br/>"
        "<b>Mode 1 — 30-Day Rolling Gaussian Z-Score (Default):</b><br/>"
        "For each day <i>t</i> with a preceding sliding window <i>W = 30 days</i> (minimum history <i>min_days = 7</i>):<br/>"
        "• <code>Mean_W = (1/N) * sum(Sales(i))</code><br/>"
        "• <code>Variance_W = max( (1/N) * sum(Sales(i)^2) - Mean_W^2, 0.0 )</code>, &nbsp; <code>Std_W = sqrt(Variance_W)</code><br/>"
        "• <code>z_score(t) = (Sales(t) - Mean_W) / Std_W</code><br/>"
        "• <b>Flagged Anomaly:</b> Flagged if <code>|z_score(t)| &gt; 2.0</code>. Classified as <code>spike</code> (z &gt; 0) or <code>drop</code> (z &lt; 0).<br/>"
        "• <b>Customer Attribution:</b> The engine joins sales logs to attribute all <code>AffectedCustomerIDs</code> who transacted on the anomaly date.<br/>"
        "<b>Mode 2 — STL Decomposition (Optional, requires statsmodels):</b><br/>"
        "Decomposes daily sales into Trend, Weekly Seasonality (period = 7 days), and Residuals: <code>Sales(t) = Trend(t) + Seasonal(t) + Resid(t)</code>. Flags dates where <code>|z(Resid)| &gt; 2.0</code>.",
        "BodyNormal"
    ))
    story.append(Spacer(1, 6))

    # Risk Subsection
    story.append(p("5.5 Rule-Based Customer Churn Risk Engine (risk.py)", "SubSecHeading"))
    story.append(p(
        "Computes a composite churn risk score (0 to 100) combining four normalized components (0.0 to 1.0):<br/>"
        "1. <b>RFM Decay (w1 = 0.40):</b> <code>rfm_decay = clip( 1 - (RFM_Score - 1)/4, 0, 1 )</code> (Lower RFM score yields higher decay risk)<br/>"
        "2. <b>Return Propensity (w2 = 0.25):</b> <code>return_rate = clip( cust_return_rate, 0, 1 )</code> (Personal refund frequency)<br/>"
        "3. <b>Purchase Gap Trend (w3 = 0.20):</b> <code>gap_trend = clip( GapTrend / AvgGap, 0, 1 )</code> (Relative widening of purchase intervals)<br/>"
        "4. <b>Anomaly Exposure (w4 = 0.15):</b> <code>anomaly = 1.0 if customer transacted on any flagged anomaly date, else 0.0</code><br/>"
        "• <b>Composite Score:</b> <code>RiskScore = round( 100 * (0.40*rfm_decay + 0.25*return_rate + 0.20*gap_trend + 0.15*anomaly), 2 )</code><br/>"
        "• <b>Risk Bands:</b> <b>Low</b> [0–25], <b>Medium</b> [25–50], <b>High</b> [50–75], <b>Critical</b> [75–100]<br/>"
        "• <b>Main Driver Attribution:</b> <code>MainReason = argmax( weighted_components )</code> (explains exact primary risk cause).",
        "BodyNormal"
    ))
    story.append(Spacer(1, 6))

    # Customer Journey Subsection
    story.append(p("5.6 Customer Journey & Purchase Gap Analysis (journey.py)", "SubSecHeading"))
    story.append(p(
        "Aggregates transactions into discrete invoices per customer sorted chronologically. Calculates consecutive gaps in days: <code>gaps = diff(InvoiceDates) / 1 day</code>.<br/>"
        "• <code>AvgGap = mean(gaps)</code> (average cadence between purchases)<br/>"
        "• <code>GapTrend = slope( linear_regression(x = 0..k, y = gaps) )</code><br/>"
        "A positive slope indicates purchase intervals are widening (cooling cadence and early churn indicator), while a negative slope indicates accelerating purchase frequency.",
        "BodyNormal"
    ))
    story.append(Spacer(1, 6))

    # Product Analytics Subsection
    story.append(p("5.7 Product Catalog & Matrix Classification (products.py)", "SubSecHeading"))
    story.append(p(
        "For each SKU (StockCode): computes GrossSales, ReturnedValue, NetRevenue, BuyerCount, TotalQtySold, and ReturnRate.<br/>"
        "• <b>Repeat Attach Rate:</b> Fraction of buyers who purchased the SKU across 2 or more distinct invoices: <code>AttachRate = mean( OrdersPerCustomer > 1 )</code>.<br/>"
        "• <b>4-Quadrant Matrix Classification (using portfolio median net revenue and attach rate):</b><br/>"
        "  - <b>Stars:</b> High Net Revenue, High Repeat Attach Rate (Core revenue drivers)<br/>"
        "  - <b>Loyalty Builders:</b> Lower Net Revenue, High Repeat Attach Rate (Habit-forming products)<br/>"
        "  - <b>One-hit Sellers:</b> High Net Revenue, Low Repeat Attach Rate (Promotional flash sellers)<br/>"
        "  - <b>Long Tail:</b> Lower Net Revenue, Low Repeat Attach Rate (Catalog review candidates)",
        "BodyNormal"
    ))
    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 6: RELATIONAL DATABASE SCHEMA & ORM MODELS
    # =========================================================================
    story.append(p("6. Relational Database Schema & SQLAlchemy ORM Models", "SecHeading"))
    story.append(hr())
    story.append(p(
        "The persistence layer is implemented in PostgreSQL using SQLAlchemy 2.0 ORM (<code>backend/app/models.py</code>). "
        "The schema comprises 11 relational tables centered on the <code>datasets</code> parent entity. "
        "All 10 child tables enforce strict foreign key constraints with <code>ondelete='CASCADE'</code> and SQLAlchemy <code>cascade='all, delete-orphan'</code>, "
        "guaranteeing that purging a dataset automatically wipes all associated KPI records, RFM scores, cohort rows, and risk profiles in an atomic database transaction.",
        "BodyNormal"
    ))

    db_tables_data = [
        [Paragraph("Table Name", styles["TableHead"]), Paragraph("ORM Model Class", styles["TableHead"]), Paragraph("Primary Columns & Data Types", styles["TableHead"]), Paragraph("Indexes & Constraints", styles["TableHead"])],
        [
            Paragraph("datasets", styles["TableCellBold"]),
            Paragraph("DatasetModel", styles["TableCell"]),
            Paragraph("id (Int PK), dataset_name (VarChar 255), file_type (VarChar 50), original_rows (Int), final_rows (Int), sales_rows (Int), return_rows (Int), gross_sales (Float), total_returns (Float), net_revenue (Float), uploaded_at (Timestamp), is_active (Bool)", styles["TableCell"]),
            Paragraph("PK: id<br/>Index: dataset_name, is_active.<br/>Parent table for all child analytics.", styles["TableCell"])
        ],
        [
            Paragraph("dashboard_kpis", styles["TableCellBold"]),
            Paragraph("KpiModel", styles["TableCell"]),
            Paragraph("id (Int PK), dataset_id (Int FK), active_customers (Int), repeat_rate (Float), churn_rate_indicative (Float), rev_retention (Float), net_revenue (Float), gross_sales (Float), total_returns (Float), total_customers (Int), return_rate (Float), created_at (Timestamp)", styles["TableCell"]),
            Paragraph("FK: dataset_id → datasets.id (CASCADE).<br/>Index: dataset_id.", styles["TableCell"])
        ],
        [
            Paragraph("monthly_trends", styles["TableCellBold"]),
            Paragraph("MonthlyTrendModel", styles["TableCell"]),
            Paragraph("id (Int PK), dataset_id (Int FK), month (VarChar 10, YYYY-MM), sales (Float), returns (Float), return_rate (Float)", styles["TableCell"]),
            Paragraph("FK: dataset_id → datasets.id (CASCADE).<br/>Index: dataset_id, month.", styles["TableCell"])
        ],
        [
            Paragraph("daily_sales", styles["TableCellBold"]),
            Paragraph("DailySalesModel", styles["TableCell"]),
            Paragraph("id (Int PK), dataset_id (Int FK), sale_date (Date), sales (Float), mean (Float), std (Float), z_score (Float), flagged (Bool), direction (VarChar 50), affected_customer_ids (Text)", styles["TableCell"]),
            Paragraph("FK: dataset_id → datasets.id (CASCADE).<br/>Index: dataset_id, sale_date.", styles["TableCell"])
        ],
        [
            Paragraph("customer_journey", styles["TableCellBold"]),
            Paragraph("CustomerJourneyModel", styles["TableCell"]),
            Paragraph("id (Int PK), dataset_id (Int FK), customer_id (BigInt), order_count (Int), first_purchase_date (Date), last_purchase_date (Date), total_revenue (Float), avg_gap (Float), gap_trend (Float)", styles["TableCell"]),
            Paragraph("FK: dataset_id → datasets.id (CASCADE).<br/>Index: dataset_id, customer_id.", styles["TableCell"])
        ],
        [
            Paragraph("rfm_segments", styles["TableCellBold"]),
            Paragraph("RfmSegmentModel", styles["TableCell"]),
            Paragraph("id (Int PK), dataset_id (Int FK), customer_id (BigInt), recency (Int), frequency (Int), monetary (Float), r_score (Int), f_score (Int), m_score (Int), rfm_score (Int), segment (VarChar 50)", styles["TableCell"]),
            Paragraph("FK: dataset_id → datasets.id (CASCADE).<br/>Index: dataset_id, customer_id, segment.", styles["TableCell"])
        ],
        [
            Paragraph("cohort_retention", styles["TableCellBold"]),
            Paragraph("CohortRetentionModel", styles["TableCell"]),
            Paragraph("id (Int PK), dataset_id (Int FK), cohort_month (VarChar 10), month_index (Int), cohort_size (Int), retention_pct (Float), retention_rev_pct (Float)", styles["TableCell"]),
            Paragraph("FK: dataset_id → datasets.id (CASCADE).<br/>Index: dataset_id, cohort_month.", styles["TableCell"])
        ],
        [
            Paragraph("returns_intelligence", styles["TableCellBold"]),
            Paragraph("ReturnsIntelligenceModel", styles["TableCell"]),
            Paragraph("id (Int PK), dataset_id (Int FK), key_name (VarChar 100), key_type (VarChar 20: SKU, Segment, Month), sales (Float), returns (Float), return_rate (Float), flagged (Bool)", styles["TableCell"]),
            Paragraph("FK: dataset_id → datasets.id (CASCADE).<br/>Index: dataset_id, key_name, key_type.", styles["TableCell"])
        ],
        [
            Paragraph("product_contribution", styles["TableCellBold"]),
            Paragraph("ProductContributionModel", styles["TableCell"]),
            Paragraph("id (Int PK), dataset_id (Int FK), stock_code (VarChar 50), description (Text), gross_sales (Float), returned_value (Float), net_revenue (Float), buyers (Int), return_rate (Float), repeat_attach_rate (Float), category (VarChar 50)", styles["TableCell"]),
            Paragraph("FK: dataset_id → datasets.id (CASCADE).<br/>Index: dataset_id, stock_code, category.", styles["TableCell"])
        ],
        [
            Paragraph("anomalies", styles["TableCellBold"]),
            Paragraph("AnomalyModel", styles["TableCell"]),
            Paragraph("id (Int PK), dataset_id (Int FK), anomaly_date (Date), sales (Float), mean (Float), std (Float), z_score (Float), flagged (Bool), direction (VarChar 50), affected_customer_ids (Text)", styles["TableCell"]),
            Paragraph("FK: dataset_id → datasets.id (CASCADE).<br/>Index: dataset_id, anomaly_date.", styles["TableCell"])
        ],
        [
            Paragraph("customer_risk", styles["TableCellBold"]),
            Paragraph("CustomerRiskModel", styles["TableCell"]),
            Paragraph("id (Int PK), dataset_id (Int FK), customer_id (BigInt), risk_score (Float), risk_band (VarChar 20), main_reason (Text), rfm_decay (Float), return_rate (Float), gap_trend (Float), anomaly (Float)", styles["TableCell"]),
            Paragraph("FK: dataset_id → datasets.id (CASCADE).<br/>Index: dataset_id, customer_id, risk_band.", styles["TableCell"])
        ],
    ]
    t_db = Table(db_tables_data, colWidths=[80, 95, 215, 114])
    t_db.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_db)
    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 7: COMPREHENSIVE REST API REFERENCE
    # =========================================================================
    story.append(p("7. Comprehensive REST API Reference (All Endpoints)", "SecHeading"))
    story.append(hr())
    story.append(p("All API endpoints are mounted under the prefix <code>/api/v1</code> in <code>backend/app/main.py</code>. Standard responses are JSON serialized with NaN and Infinity values sanitized to null.", "BodyNormal"))

    api_endpoints = [
        [Paragraph("HTTP", styles["TableHead"]), Paragraph("Endpoint Route", styles["TableHead"]), Paragraph("Query / Body Parameters", styles["TableHead"]), Paragraph("Response Format & Description", styles["TableHead"])],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/health", styles["TableCellCode"]),
            Paragraph("None", styles["TableCell"]),
            Paragraph("Returns system status, service name, and PostgreSQL connection probe (connected, pool size, error).", styles["TableCell"])
        ],
        [
            Paragraph("POST", styles["TableCellBold"]),
            Paragraph("/datasets/upload", styles["TableCellCode"]),
            Paragraph("<code>file: UploadFile</code> (multipart form)", styles["TableCell"]),
            Paragraph("Accepts CSV, XLSX, Parquet. Starts background pipeline, returns fileType and cleaningSummary counts.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/status", styles["TableCellCode"]),
            Paragraph("None", styles["TableCell"]),
            Paragraph("Polling endpoint returning status ('idle', 'processing', 'ready', 'failed'), datasetId, and cleaning summary.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets", styles["TableCellCode"]),
            Paragraph("None", styles["TableCell"]),
            Paragraph("Lists all stored datasets from PostgreSQL with row counts, upload timestamps, and active status flag.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/{id}", styles["TableCellCode"]),
            Paragraph("Path: <code>dataset_id</code> (Int or string)", styles["TableCell"]),
            Paragraph("Returns comprehensive aggregated snapshot (KPIs, monthly series, segment shares, risk samples) by ID.", styles["TableCell"])
        ],
        [
            Paragraph("DELETE", styles["TableCellBold"]),
            Paragraph("/datasets/{id}", styles["TableCellCode"]),
            Paragraph("Path: <code>dataset_id</code> (Int)", styles["TableCell"]),
            Paragraph("Cascading deletion of dataset record and all child tables from PostgreSQL; purges cached disk files.", styles["TableCell"])
        ],
        [
            Paragraph("POST", styles["TableCellBold"]),
            Paragraph("/datasets/clear", styles["TableCellCode"]),
            Paragraph("None", styles["TableCell"]),
            Paragraph("Purges all stored datasets from PostgreSQL, frees disk storage cache, and resets in-memory singleton.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/overview", styles["TableCellCode"]),
            Paragraph("None", styles["TableCell"]),
            Paragraph("Returns headline KPIs, monthly sales trends, segment mix distribution, and auto-generated textual insights.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/report-data", styles["TableCellCode"]),
            Paragraph("None", styles["TableCell"]),
            Paragraph("High-performance server-side join (Risk + RFM + Journey) returning revenueAtRisk, watchlist, and segment shares for PDF generator.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/journey", styles["TableCellCode"]),
            Paragraph("<code>page, page_size, sort_by, order</code>", styles["TableCell"]),
            Paragraph("Paginated customer journeys with order count, first/last purchase dates, revenue, avg gap, and gap trend slope.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/segments", styles["TableCellCode"]),
            Paragraph("<code>page, page_size, segment</code>", styles["TableCell"]),
            Paragraph("Paginated RFM scores (R, F, M, RFM_Score) and segment distribution breakdown counts.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/cohorts", styles["TableCellCode"]),
            Paragraph("None", styles["TableCell"]),
            Paragraph("13-month triangle cohort retention matrix containing both customer count retention and revenue retention.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/returns", styles["TableCellCode"]),
            Paragraph("<code>keyType: SKU|Segment|Month, flaggedOnly: Bool</code>", styles["TableCell"]),
            Paragraph("Returns margin leakage diagnostics, portfolio benchmark average, and items flagged above the portfolio mean.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/products", styles["TableCellCode"]),
            Paragraph("<code>page, page_size, search, category, sort_by, order</code>", styles["TableCell"]),
            Paragraph("Paginated catalog performance: GrossSales, ReturnedValue, NetRevenue, Buyers, ReturnRate, Category (Stars, etc.).", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/products/{stock_code}", styles["TableCellCode"]),
            Paragraph("Path: <code>stock_code</code> (string)", styles["TableCell"]),
            Paragraph("Detailed product view including monthly sales trajectory and order count history for a specific SKU.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/anomalies", styles["TableCellCode"]),
            Paragraph("<code>method: rolling|stl, flaggedOnly: Bool</code>", styles["TableCell"]),
            Paragraph("Daily time series with rolling mean, std, z_score, flagged boolean, direction (spike/drop), and affected customers.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/risk", styles["TableCellCode"]),
            Paragraph("<code>page, page_size, band, rfm_decay, return_rate, gap_trend, anomaly</code>", styles["TableCell"]),
            Paragraph("Rule-based churn risk scores (0–100) with dynamic query parameter factor weight overrides.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/customers/{customer_id}", styles["TableCellCode"]),
            Paragraph("Path: <code>customer_id</code> (Int)", styles["TableCell"]),
            Paragraph("Customer 360 view: complete transaction history, RFM quintile scores, risk breakdown, and monthly purchase timeline.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/export/{table}.csv", styles["TableCellCode"]),
            Paragraph("Path: <code>table</code> (journey, rfm, cohorts, returns, products, anomalies, risk)", styles["TableCell"]),
            Paragraph("Streams raw analytical data tables as downloadable CSV files with attachment Content-Disposition header.", styles["TableCell"])
        ],
        [
            Paragraph("GET", styles["TableCellBold"]),
            Paragraph("/datasets/cleaned-file", styles["TableCellCode"]),
            Paragraph("None", styles["TableCell"]),
            Paragraph("Streams sanitized production Excel workbook (.xlsx) containing normalized columns, dates, and LineValue.", styles["TableCell"])
        ],
    ]
    t_api = Table(api_endpoints, colWidths=[42, 130, 142, 190])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_api)
    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 8: FRONTEND ARCHITECTURE & ALL 14 PAGES EXPLAINED
    # =========================================================================
    story.append(p("8. Frontend Architecture & Complete Page Specifications", "SecHeading"))
    story.append(hr())
    story.append(p(
        "The frontend is structured into 14 distinct feature routes orchestrated by React Router v6. "
        "The global application layout (<code>AppShell.tsx</code>) provides a collapsible desktop sidebar, topbar with active dataset switching, "
        "and a mobile bottom navigation bar. Every feature page is detailed below:",
        "BodyNormal"
    ))

    pages_spec = [
        [Paragraph("Page Route", styles["TableHead"]), Paragraph("Feature Name", styles["TableHead"]), Paragraph("Visual Components & Charts", styles["TableHead"]), Paragraph("Analytical Focus & User Interactions", styles["TableHead"])],
        [
            Paragraph("/data-source", styles["TableCellCode"]),
            Paragraph("Data Source & Upload", styles["TableCellBold"]),
            Paragraph("UploadCard (Cleaned & Raw dropzones), ValidationPanel, RecentDatasets table, Demo dataset loader.", styles["TableCell"]),
            Paragraph("File ingestion gateway; parses CSV/Excel; provides pre-upload column validation and instant status feedback.", styles["TableCell"])
        ],
        [
            Paragraph("/overview", styles["TableCellCode"]),
            Paragraph("Executive Overview", styles["TableCellBold"]),
            Paragraph("KpiGrid (6 metric cards with sparklines), MonthlySalesPanel (Sales vs Returns line), SegmentMixPanel (Donut), LeakagePanel (Waterfall).", styles["TableCell"]),
            Paragraph("High-level executive dashboard showing net revenue, churn rate, repeat rate, cash leakage, and primary portfolio KPIs.", styles["TableCell"])
        ],
        [
            Paragraph("/compare", styles["TableCellCode"]),
            Paragraph("Dataset Benchmarking", styles["TableCellBold"]),
            Paragraph("Dataset selector dropdown, side-by-side KPI comparison cards, Dual-line Monthly Sales Trajectory chart, Segment Migration grouped bar.", styles["TableCell"]),
            Paragraph("Benchmarks active upload against historical baseline (e.g. Q3 baseline or prior month snapshot); detects cohort drift.", styles["TableCell"])
        ],
        [
            Paragraph("/journey", styles["TableCellCode"]),
            Paragraph("Customer Journey", styles["TableCellBold"]),
            Paragraph("Order Frequency histogram, Purchase Interval Gap histogram, Customer Value Tiers (Lorenz curve), sortable Customer Table.", styles["TableCell"]),
            Paragraph("Tracks customer longevity, inter-purchase gaps (widening vs accelerating), and revenue concentration across VIP tiers.", styles["TableCell"])
        ],
        [
            Paragraph("/segments", styles["TableCellCode"]),
            Paragraph("RFM Segmentation", styles["TableCellBold"]),
            Paragraph("3D Bubble Scatter Plot (Recency vs Frequency scaled by Spend), Segment Filter Chips, RFM Rules legend, Paginated RFM table.", styles["TableCell"]),
            Paragraph("Clusters customers into 6 lifecycle tiers (Champion, Loyal, Promising, New, At-Risk, Lost) based on quintile scores.", styles["TableCell"])
        ],
        [
            Paragraph("/cohorts", styles["TableCellCode"]),
            Paragraph("Cohort Retention", styles["TableCellBold"]),
            Paragraph("Triangle Heatmap Matrix (13 months), Toggle between Customer % and Revenue %, Retention Decay curves, Cohort Size bars.", styles["TableCell"]),
            Paragraph("Measures long-term customer and revenue retention from initial acquisition month; pinpoints month-over-month drop-off.", styles["TableCell"])
        ],
        [
            Paragraph("/returns", styles["TableCellCode"]),
            Paragraph("Returns & Leakage", styles["TableCellBold"]),
            Paragraph("Breakdown Tabs (By SKU, By Segment, By Month), Return Rate Bar with Portfolio Benchmark line, Share of Sales vs Returns bars.", styles["TableCell"]),
            Paragraph("Identifies high-return merchandise and buyer segments disproportionately eroding gross profit margins.", styles["TableCell"])
        ],
        [
            Paragraph("/products", styles["TableCellCode"]),
            Paragraph("Product Contribution", styles["TableCellBold"]),
            Paragraph("Top-10 Revenue Products bar, 4-Quadrant Scatter Matrix (Return Rate vs Repeat Attach Rate), Product Catalog DataTable.", styles["TableCell"]),
            Paragraph("Classifies catalog items into Stars, Loyalty Builders, One-hit Sellers, and Long Tail to optimize merchandising.", styles["TableCell"])
        ],
        [
            Paragraph("/anomalies", styles["TableCellCode"]),
            Paragraph("Demand Anomalies", styles["TableCellBold"]),
            Paragraph("Dual-axis Daily Sales & Z-score bar chart, KPI counters (Flagged days, Spikes, Drops), Affected Customer Account list.", styles["TableCell"]),
            Paragraph("Detects statistical shocks (|z| &gt; 2.0); attributes revenue spikes to wholesale buyers and drops to stockouts.", styles["TableCell"])
        ],
        [
            Paragraph("/risk", styles["TableCellCode"]),
            Paragraph("Customer Risk Radar", styles["TableCellBold"]),
            Paragraph("Risk Decile Distribution histogram, Segment Average Risk bars, 4 Interactive Weight Sliders, High-Risk Watchlist table.", styles["TableCell"]),
            Paragraph("Scores churn probability (0–100) per customer; allows executive adjustment of RFM decay, returns, and gap weights.", styles["TableCell"])
        ],
        [
            Paragraph("/simulator", styles["TableCellCode"]),
            Paragraph("What-If Simulator", styles["TableCellBold"]),
            Paragraph("Segment Selector buttons, Campaign Reach slider, Conversion Rate slider, Order Multiplier slider, Step-by-Step Revenue calculation.", styles["TableCell"]),
            Paragraph("Simulates marketing campaign ROI and projected incremental revenue across selected customer cohorts before execution.", styles["TableCell"])
        ],
        [
            Paragraph("/methodology", styles["TableCellCode"]),
            Paragraph("Methodology & Equations", styles["TableCellBold"]),
            Paragraph("Accordion topics with sticky sidebar table of contents, mathematical formula badges, concrete calculation examples.", styles["TableCell"]),
            Paragraph("Provides complete algorithmic transparency for all platform metrics; proves absence of black-box heuristics.", styles["TableCell"])
        ],
        [
            Paragraph("/ml-lab", styles["TableCellCode"]),
            Paragraph("Machine Learning Lab", styles["TableCellBold"]),
            Paragraph("Model Cards (CLV Regression, Churn Classification, Market Basket Apriori), 'Coming Soon' preview overlays.", styles["TableCell"]),
            Paragraph("Demonstrates roadmap expansion for advanced predictive machine learning models in future platform releases.", styles["TableCell"])
        ],
        [
            Paragraph("/pipeline", styles["TableCellCode"]),
            Paragraph("Pipeline Status Scaffold", styles["TableCellBold"]),
            Paragraph("Automatic redirect handler to /overview.", styles["TableCell"]),
            Paragraph("Maintains URL backwards compatibility for dataset upload workflows.", styles["TableCell"])
        ],
    ]
    t_pages = Table(pages_spec, colWidths=[65, 95, 170, 174])
    t_pages.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_pages)
    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 9: 5-PAGE BOARD-READY PDF REPORT GENERATOR
    # =========================================================================
    story.append(p("9. Five-Page Board-Ready PDF Presentation Report", "SecHeading"))
    story.append(hr())
    story.append(p(
        "In addition to on-screen interactive dashboards, Acuity includes a client-side vector PDF reporting engine "
        "(<code>frontend/src/lib/pdf-report.ts</code>) that converts analytics into a formatted 5-page executive presentation report for C-suite leadership:",
        "BodyNormal"
    ))

    pdf_pages_data = [
        [Paragraph("Page", styles["TableHead"]), Paragraph("Executive Title", styles["TableHead"]), Paragraph("Sections, Scorecards & Tables", styles["TableHead"]), Paragraph("Business & Strategic Purpose", styles["TableHead"])],
        [
            Paragraph("Page 1", styles["TableCellBold"]),
            Paragraph("Executive Scorecard & Cashflow Reconciliation", styles["TableCellBold"]),
            Paragraph("Corporate Header, 6 Core KPI scorecards (Net Revenue, Active Accounts, Repeat Rate, Churn Rate, Rev Retention, Return Rate), Leakage Waterfall bar, Monthly Net Revenue trajectory chart.", styles["TableCell"]),
            Paragraph("Gives Chief Commercial Officers immediate visibility into net cash capture, gross margin erosion, and seasonal trajectory.", styles["TableCell"])
        ],
        [
            Paragraph("Page 2", styles["TableCellBold"]),
            Paragraph("Customer Lifecycle & RFM Segmentation", styles["TableCellBold"]),
            Paragraph("Complete 6-tier RFM segment breakdown table (Account count, % share, Total Spend, AOV, Return Rate), Segment Revenue Concentration analysis, Quintile Scoring rule reference.", styles["TableCell"]),
            Paragraph("Enables marketing leaders to allocate retention budgets according to true customer value and migration risk.", styles["TableCell"])
        ],
        [
            Paragraph("Page 3", styles["TableCellBold"]),
            Paragraph("Capital Exposure & Churn Risk Radar", styles["TableCellBold"]),
            Paragraph("Total Capital Exposed metric banner, Risk Decile Distribution chart, Top-15 High-Risk Key Account Watchlist with Customer ID, Segment, Risk Score, Spend, and Prescribed Action.", styles["TableCell"]),
            Paragraph("Armors customer success teams with proactive retention targets to prevent high-value account churn.", styles["TableCell"])
        ],
        [
            Paragraph("Page 4", styles["TableCellBold"]),
            Paragraph("Product Catalog Margin Leakage & Stars", styles["TableCellBold"]),
            Paragraph("Top 10 Gross Revenue SKUs table, High-Return Leakage Catalog Lines table (units > 30, return rate > benchmark), Supplier QA Mitigation guidelines.", styles["TableCell"]),
            Paragraph("Highlights specific inventory lines causing refund drain to inform supplier negotiations and quality control.", styles["TableCell"])
        ],
        [
            Paragraph("Page 5", styles["TableCellBold"]),
            Paragraph("Demand Shock Timeline & 90-Day Strategic Roadmap", styles["TableCellBold"]),
            Paragraph("Chronological demand anomaly timeline (flagged date, shock direction, volume, affected buyers), Phased 90-Day Implementation Action Plan (Days 1–30, 31–60, 61–90).", styles["TableCell"]),
            Paragraph("Translates retrospective diagnostics into actionable operational initiatives and milestone deliverables.", styles["TableCell"])
        ],
    ]
    t_pdf = Table(pdf_pages_data, colWidths=[48, 115, 195, 146])
    t_pdf.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_pdf)
    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 10: VERIFICATION, TESTING & EXECUTION GUIDE
    # =========================================================================
    story.append(p("10. Testing Suite, Verification & Deployment Guide", "SecHeading"))
    story.append(hr())
    story.append(p(
        "Acuity includes a test suite covering the entire pipeline. SQLite in-memory databases are utilized during automated testing to verify ORM schemas and cascading deletes without external database dependencies:",
        "BodyNormal"
    ))
    story.append(p("• <code>backend/tests/test_cleaning.py</code>: Validates header normalization, deduplication, removal of invalid customer IDs, negative price handling, and return segregation.", "BulletItem"))
    story.append(p("• <code>backend/tests/test_analytics.py</code>: Verifies mathematical accuracy of RFM quintiles, cohort retention percentages, rolling Gaussian z-scores, and rule-based risk calculations.", "BulletItem"))
    story.append(p("• <code>backend/tests/test_database.py</code>: Confirms that all 11 ORM models compile cleanly against SQLAlchemy and validates foreign key cascade deletion.", "BulletItem"))
    story.append(p("• <code>backend/tests/test_api.py</code>: Tests FastAPI endpoints using Starlette TestClient to guarantee JSON serialization and proper HTTP status codes.", "BulletItem"))
    story.append(Spacer(1, 8))

    setup_instructions = (
        "<b>QUICK START EXECUTION INSTRUCTIONS:</b><br/>"
        "1. Backend Startup:<br/>"
        "   cd backend<br/>"
        "   python -m venv venv && .\\venv\\Scripts\\activate   (or source venv/bin/activate on Linux/Mac)<br/>"
        "   pip install -r requirements.txt<br/>"
        "   python scripts/init_db.py                         # Compiles PostgreSQL tables<br/>"
        "   uvicorn app.main:app --reload --port 8000<br/><br/>"
        "2. Frontend Startup:<br/>"
        "   cd frontend<br/>"
        "   npm install<br/>"
        "   npm run dev                                       # Starts Vite dev server at http://localhost:3000<br/><br/>"
        "3. Production Build Verification:<br/>"
        "   npm run build                                     # Compiles production TypeScript bundle into frontend/dist"
    )
    t_setup = Table([[Paragraph(setup_instructions, styles["CodeSnippet"])]], colWidths=[504])
    t_setup.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_setup)
    story.append(Spacer(1, 14))

    # Concluding Note
    concl_text = (
        "<b>Summary & Mini Project Conclusion:</b> Acuity successfully bridges the divide between static reporting spreadsheets "
        "and opaque AI models by offering a fast, transparent, deterministic analytics pipeline. "
        "From ingestion to multi-page executive PDF rendering and PostgreSQL persistence, all subsystems are rigorously tested, "
        "type-safe, and ready for production or academic presentation."
    )
    t_concl = Table([[Paragraph(concl_text, styles["BodyNormal"])]], colWidths=[504])
    t_concl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#93C5FD")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_concl)

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[Acuity] Successfully generated full project specification PDF: {filename}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "Acuity_Complete_Project_Specification_Report.pdf"
    build_pdf(out_file)
