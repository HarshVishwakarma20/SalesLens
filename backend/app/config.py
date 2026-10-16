"""
Global configuration — paths, defaults, weights.
Change values here rather than hunting through the codebase.
"""
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(exist_ok=True)

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
