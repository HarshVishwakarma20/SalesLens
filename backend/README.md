# Acuity Backend

FastAPI backend for the Acuity e-commerce customer analytics platform.

---

## What it does

Upload a raw UCI Online Retail-style file **or** a pre-cleaned transactions
CSV/Excel, and the backend will:

1. Detect the file type from its column names.
2. Clean raw data following the project notebook's pipeline.
3. Run all analytics in the background:
   - Customer Journey (first/last purchase, order count, gap trend)
   - RFM Segmentation (Champion, Loyal, New, At-Risk, Lost, Promising)
   - Cohort Retention (customer & revenue retention %)
   - Returns Intelligence (by SKU, segment, and month)
   - Product Contribution (categories: Stars, Loyalty Builders, One-hit Sellers, Long Tail)
   - Sales Anomaly Detection (rolling z-score; optional STL mode)
   - Rule-based Customer Risk Scoring
   - Headline KPIs and auto-generated insights
4. Serve results through a clean REST API for the frontend to consume.

---

## Tech stack

| Concern | Library |
|---|---|
| API framework | FastAPI + Uvicorn |
| Data processing | pandas, numpy |
| Validation | Pydantic v2 |
| Anomaly (STL mode) | statsmodels |
| Testing | pytest + httpx |

---

## Local setup

### 1 — Prerequisites

- Python 3.11 or later
- pip

### 2 — Create and activate a virtual environment

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python -m venv .venv
source .venv/bin/activate
```

### 3 — Install dependencies

```bash
pip install -r requirements.txt
```

### 4 — Run the development server

```bash
# from inside the backend/ directory
uvicorn app.main:app --reload --port 8000
```

The API will be available at **http://localhost:8000**.  
Interactive docs: **http://localhost:8000/docs**

---

## API reference

All endpoints are prefixed with `/api/v1`.

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/datasets/upload` | Upload CSV or Excel file |
| GET | `/datasets/status` | Current processing status |
| GET | `/datasets/overview` | Headline KPIs, trends, insights |
| GET | `/datasets/journey` | Customer journey (paginated) |
| GET | `/datasets/segments` | RFM scores and segments |
| GET | `/datasets/cohorts` | Cohort retention table |
| GET | `/datasets/returns` | Return rate breakdowns |
| GET | `/datasets/products` | Searchable product list |
| GET | `/datasets/products/{stockCode}` | Single product detail |
| GET | `/datasets/anomalies` | Daily sales + flagged anomalies |
| GET | `/datasets/risk` | Customer risk scores |
| GET | `/datasets/customers/{customerId}` | Customer 360 view |
| GET | `/datasets/export/{table}.csv` | Download a result table as CSV |
| GET | `/datasets/cleaned-file` | Download cleaned Excel (raw uploads only) |

### Upload flow

```
POST /datasets/upload      → status: "processing"
GET  /datasets/status      → poll until status == "ready"
GET  /datasets/overview    → use the results
```

### Anomaly method

```
GET /datasets/anomalies?method=rolling   (default — no extra dependencies)
GET /datasets/anomalies?method=stl       (requires statsmodels)
```

### Risk weight override

Pass custom weights as query parameters (must sum to 1.0):

```
GET /datasets/risk?rfm_decay=0.5&return_rate=0.2&gap_trend=0.2&anomaly=0.1
```

---

## Running tests

```bash
# from inside the backend/ directory
pytest tests/ -v
```

---

## Project structure

```
backend/
├── requirements.txt
├── README.md
├── storage/                  ← uploaded and cleaned files are saved here
└── app/
    ├── main.py               ← FastAPI app, CORS, router
    ├── config.py             ← paths, defaults, weights
    ├── state.py              ← in-memory singleton
    ├── utils.py              ← JSON sanitiser, pagination
    ├── schemas.py            ← Pydantic models
    ├── cleaning.py           ← file detection + cleaning pipeline
    ├── services.py           ← pipeline orchestration
    ├── routes.py             ← all API handlers
    └── analytics/
        ├── journey.py
        ├── rfm.py
        ├── cohorts.py
        ├── returns.py
        ├── products.py
        ├── anomalies.py
        ├── risk.py
        └── kpis.py
```

---

## Important limitations

### In-memory state

All DataFrames and computed results are **held in process memory** while the
server is running.  There is no database.

Implications:

- **Restarting the server clears all data.** You must re-upload the file.
- **Only one dataset is active at a time.** Uploading a new file replaces the
  previous one immediately.
- **Memory usage scales with the dataset size.** The UCI Online Retail file
  (≈ 500 k rows) uses roughly 200-400 MB of RAM after cleaning and analytics.
  Very large files may exhaust available memory.

This design was chosen deliberately to keep the backend simple and
database-free for the first version.

### Concurrent uploads

The background thread pool has `max_workers=1`.  If a second file is uploaded
while the first is still processing, the first run is discarded and the new
file starts processing immediately.

### The last calendar month in the UCI dataset

The UCI Online Retail dataset ends mid-December 2011.  The indicative churn
rate shown in the overview is based on that partial month and should be
treated as approximate.

---

## Analytics source of truth

All formulas, weights, thresholds, and segmentation rules are taken directly
from **Acuity_Phase3.ipynb**.  See the notebook comments for the rationale
behind each design choice.
