"""
Global configuration — paths, defaults, weights.
Change values here rather than hunting through the codebase.
"""
import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Paths & Environment Loading
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_DIR = BASE_DIR.parent

# Load .env from workspace root or backend dir
load_dotenv(WORKSPACE_DIR / ".env")
load_dotenv(BASE_DIR / ".env")

STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# Database Configuration (PostgreSQL)
# ---------------------------------------------------------------------------
DB_HOST: str = os.getenv("DB_HOST", "localhost")
DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
DB_NAME: str = os.getenv("DB_NAME", "acuity_db")
DB_USER: str = os.getenv("DB_USER", "postgres")
DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
DB_SSLMODE: str = os.getenv("DB_SSLMODE", "prefer")


def get_database_url() -> str:
    """Construct SQLAlchemy database connection URL using psycopg2 driver."""
    custom_url = os.getenv("DATABASE_URL")
    if custom_url:
        if custom_url.startswith("postgresql://"):
            return custom_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return custom_url
    pwd = quote_plus(DB_PASSWORD) if DB_PASSWORD else ""
    user = quote_plus(DB_USER) if DB_USER else "postgres"
    auth = f"{user}:{pwd}@" if pwd else (f"{user}@" if user else "")
    return f"postgresql+psycopg2://{auth}{DB_HOST}:{DB_PORT}/{DB_NAME}"

# ---------------------------------------------------------------------------
# Anomaly detection defaults  (notebook cell 17)
# ---------------------------------------------------------------------------
ANOMALY_WINDOW: int = 30
ANOMALY_THRESHOLD: float = 2.0
ANOMALY_MIN_DAYS: int = 7
STL_PERIOD: int = 7

# ---------------------------------------------------------------------------
# RFM weights  (notebook cell 8)
# ---------------------------------------------------------------------------
RFM_WEIGHTS: dict = {"R": 0.4, "F": 0.3, "M": 0.3}

# ---------------------------------------------------------------------------
# Risk score default weights  (notebook cell 19)
# ---------------------------------------------------------------------------
RISK_WEIGHTS: dict = {
    "rfm_decay": 0.40,
    "return_rate": 0.25,
    "gap_trend": 0.20,
    "anomaly": 0.15,
}

# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------
DEFAULT_PAGE_SIZE: int = 50
MAX_PAGE_SIZE: int = 500

# ---------------------------------------------------------------------------
# Report generation settings
# ---------------------------------------------------------------------------
# Minimum quantity of units sold for a product to appear in the PDF report
MIN_PRODUCT_UNITS: int = 50
# Currency symbols — UCI / UK default (£); India datasets detect and use ₹
CURRENCY_SYMBOL: str = "\u00a3"          # £
CURRENCY_SYMBOL_INDIA: str = "\u20b9"    # ₹

