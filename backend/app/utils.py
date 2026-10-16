"""
Shared utility helpers used across the application.
"""
from __future__ import annotations

import math
from typing import Any


# ---------------------------------------------------------------------------
# JSON-safe serialisation helpers
# ---------------------------------------------------------------------------

def _safe(v: Any) -> Any:
    """Return None for NaN / ±Inf so FastAPI can serialise the value."""
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def sanitize(obj: Any) -> Any:
    """
    Recursively walk a dict / list and replace every non-finite float with None.
    Call this on any dict before returning it from a route handler.
    """
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(item) for item in obj]
    return _safe(obj)


# ---------------------------------------------------------------------------
# Pagination helper
# ---------------------------------------------------------------------------

def paginate(items: list, page: int, page_size: int) -> dict:
    """
    Slice *items* and return a dict with pagination metadata.

    >>> paginate([1, 2, 3, 4, 5], page=2, page_size=2)
    {'items': [3, 4], 'total': 5, 'page': 2, 'pageSize': 2, 'totalPages': 3}
    """
    total = len(items)
    total_pages = max(1, math.ceil(total / page_size))
    page = max(1, min(page, total_pages))
    start = (page - 1) * page_size
    end = start + page_size
    return {
        "items": items[start:end],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
    }
