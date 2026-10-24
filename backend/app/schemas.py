"""
Pydantic request and response models.

Kept deliberately thin — complex nested structures use plain dicts
in the route layer to avoid fighting Pydantic over pandas nullable types.
"""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, field_validator


# ---------------------------------------------------------------------------
# Generic wrappers
# ---------------------------------------------------------------------------

class OkResponse(BaseModel):
    ok: bool = True
    message: str = "success"


class ErrorResponse(BaseModel):
    ok: bool = False
    detail: str


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    ok: bool = True
    message: str
    fileType: str                   # 'raw' or 'cleaned'
    datasetName: str
    cleaningSummary: dict[str, Any]


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

class StatusResponse(BaseModel):
    status: str                     # idle | processing | ready | failed
    datasetName: Optional[str] = None
    datasetId: Optional[int] = None
    isRawInput: Optional[bool] = None
    error: Optional[str] = None
    cleaningSummary: Optional[dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Risk weight override (optional query body)
# ---------------------------------------------------------------------------

class RiskWeightParams(BaseModel):
    rfm_decay: float = 0.40
    return_rate: float = 0.25
    gap_trend: float = 0.20
    anomaly: float = 0.15

    @field_validator("rfm_decay", "return_rate", "gap_trend", "anomaly")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("All weights must be non-negative")
        return v

    def as_dict(self) -> dict[str, float]:
        return {
            "rfm_decay": self.rfm_decay,
            "return_rate": self.return_rate,
            "gap_trend": self.gap_trend,
            "anomaly": self.anomaly,
        }

    @field_validator("anomaly")
    @classmethod
    def weights_sum_to_one(cls, v: float, info: Any) -> float:
        # Validate the sum after all fields are set
        # (called last because 'anomaly' is the last field)
        total = (
            info.data.get("rfm_decay", 0)
            + info.data.get("return_rate", 0)
            + info.data.get("gap_trend", 0)
            + v
        )
        if abs(total - 1.0) > 1e-6:
            raise ValueError(
                f"Weights must sum to 1.0, got {total:.6f}"
            )
        return v
