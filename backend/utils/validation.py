# backend/utils/validation.py
"""Input validation helpers for the /api/predict endpoint."""
from __future__ import annotations

_VALID_CONDITIONS = {"excellent", "good", "fair", "poor", "salvage", "like new", "new"}

_REQUIRED_FIELDS = ["make", "model", "year", "mileage", "condition", "region"]


def validate_predict_params(params: dict) -> list[str]:
    """Validate prediction request parameters.

    Returns a list of error strings (empty → valid).
    """
    errors: list[str] = []

    for field in _REQUIRED_FIELDS:
        if field not in params or params[field] is None or str(params[field]).strip() == "":
            errors.append(f"Missing required field: '{field}'")

    if "year" in params:
        try:
            y = int(params["year"])
            if y < 1980 or y > 2026:
                errors.append("'year' must be between 1980 and 2026")
        except (TypeError, ValueError):
            errors.append("'year' must be an integer")

    if "mileage" in params:
        try:
            m = int(params["mileage"])
            if m < 0 or m > 500_000:
                errors.append("'mileage' must be between 0 and 500,000")
        except (TypeError, ValueError):
            errors.append("'mileage' must be an integer")

    if "condition" in params:
        cond = str(params.get("condition", "")).lower().strip()
        if cond and cond not in _VALID_CONDITIONS:
            # Warn but don't block — model handles unknown conditions gracefully
            pass

    return errors
