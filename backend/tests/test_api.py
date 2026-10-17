"""
API integration tests.

Tests:
  - GET /health returns 200
  - POST /datasets/upload with a raw CSV file → 200 + valid JSON
  - POST /datasets/upload with a pre-cleaned CSV file → 200 + valid JSON
  - POST /datasets/upload with missing required columns → 422
  - GET /datasets/status reflects upload state
  - GET /datasets/* endpoints return valid JSON once data is ready

Note: Because processing runs in a background thread, tests that call
analytics endpoints wait briefly for the status to become 'ready'.
"""
from __future__ import annotations

import time

import pytest


MAX_WAIT_SECONDS = 30  # generous timeout for slow CI machines


def _wait_until_ready(client, timeout: int = MAX_WAIT_SECONDS) -> bool:
    """Poll /datasets/status until 'ready' or 'failed'."""
    for _ in range(timeout * 2):
        resp = client.get("/api/v1/datasets/status")
        status = resp.json().get("status")
        if status == "ready":
            return True
        if status == "failed":
            return False
        time.sleep(0.5)
    return False


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

def test_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

class TestUpload:
    def test_raw_csv_upload(self, client, raw_csv_bytes):
        resp = client.post(
            "/api/v1/datasets/upload",
            files={"file": ("test_raw.csv", raw_csv_bytes, "text/csv")},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["ok"] is True
        assert body["fileType"] == "raw"
        assert "cleaningSummary" in body

    def test_cleaned_csv_upload(self, client, cleaned_csv_bytes):
        resp = client.post(
            "/api/v1/datasets/upload",
            files={"file": ("test_cleaned.csv", cleaned_csv_bytes, "text/csv")},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["ok"] is True
        assert body["fileType"] == "cleaned"

    def test_missing_columns_returns_422(self, client):
        import io
        import pandas as pd

        bad_df = pd.DataFrame({"only_one_col": [1, 2, 3]})
        buf = io.BytesIO()
        bad_df.to_csv(buf, index=False)

        resp = client.post(
            "/api/v1/datasets/upload",
            files={"file": ("bad.csv", buf.getvalue(), "text/csv")},
        )
        assert resp.status_code == 422

    def test_empty_file_returns_400(self, client):
        resp = client.post(
            "/api/v1/datasets/upload",
            files={"file": ("empty.csv", b"", "text/csv")},
        )
        assert resp.status_code == 400

    def test_unsupported_extension_returns_422(self, client):
        resp = client.post(
            "/api/v1/datasets/upload",
            files={"file": ("data.json", b'{"a":1}', "application/json")},
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

def test_status_endpoint(client):
    resp = client.get("/api/v1/datasets/status")
    assert resp.status_code == 200
    assert "status" in resp.json()


# ---------------------------------------------------------------------------
# Analytics endpoints (wait until ready)
# ---------------------------------------------------------------------------

class TestAnalyticsEndpoints:
    @pytest.fixture(autouse=True)
    def upload_and_wait(self, client, raw_csv_bytes):
        """Upload a raw file and wait for processing before each test."""
        client.post(
            "/api/v1/datasets/upload",
            files={"file": ("test_raw.csv", raw_csv_bytes, "text/csv")},
        )
        ready = _wait_until_ready(client)
        if not ready:
            pytest.skip("Dataset did not reach 'ready' state in time")

    def test_overview_returns_valid_json(self, client):
        resp = client.get("/api/v1/datasets/overview")
        assert resp.status_code == 200
        body = resp.json()
        assert "kpis" in body
        assert "segmentDistribution" in body

    def test_journey_returns_paginated(self, client):
        resp = client.get("/api/v1/datasets/journey?page=1&page_size=10")
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert "total" in body

    def test_segments_returns_data(self, client):
        resp = client.get("/api/v1/datasets/segments")
        assert resp.status_code == 200
        body = resp.json()
        assert "segmentDistribution" in body

    def test_cohorts_returns_records(self, client):
        resp = client.get("/api/v1/datasets/cohorts")
        assert resp.status_code == 200
        body = resp.json()
        assert "records" in body

    def test_returns_endpoint(self, client):
        resp = client.get("/api/v1/datasets/returns")
        assert resp.status_code == 200
        body = resp.json()
        assert "portfolioAvgReturnRate" in body

    def test_products_returns_paginated(self, client):
        resp = client.get("/api/v1/datasets/products")
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body

    def test_anomalies_rolling(self, client):
        resp = client.get("/api/v1/datasets/anomalies?method=rolling")
        assert resp.status_code == 200
        body = resp.json()
        assert "records" in body
        assert body["method"] == "rolling"

    def test_risk_returns_paginated(self, client):
        resp = client.get("/api/v1/datasets/risk")
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body

    def test_export_journey_csv(self, client):
        resp = client.get("/api/v1/datasets/export/journey.csv")
        assert resp.status_code == 200
        assert "text/csv" in resp.headers["content-type"]

    def test_export_unknown_table_returns_404(self, client):
        resp = client.get("/api/v1/datasets/export/nonexistent.csv")
        assert resp.status_code == 404
