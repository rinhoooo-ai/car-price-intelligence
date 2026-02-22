# backend/agents/risk_agent.py
"""RiskAssessmentAgent — pure Python volatility, risk, and uncertainty calculation."""
from __future__ import annotations
from backend.utils.smoothing import bound


def run(
    predicted_price: float,
    forecast_90d: float,
    confidence_base: int,
    inventory_trend: str,
    has_price_history: bool,
) -> dict:
    """Classify volatility, compute risk score and uncertainty range.

    Returns
    -------
    {
        "volatility_index": "Low" | "Moderate" | "High",
        "risk_score": int,          # 0-100
        "uncertainty_range": {"low": float, "high": float},
        "predicted_90_day_change": float,   # percentage
        "agent_log_entry": {...},
    }
    """
    # ── 90-day change percentage ──────────────────────────────────────────────
    if predicted_price > 0:
        change_pct = round((forecast_90d - predicted_price) / predicted_price * 100, 2)
    else:
        change_pct = 0.0

    abs_change = abs(change_pct)

    # ── Volatility classification ─────────────────────────────────────────────
    #   Low:      |change| ≤ 2% AND inventory is known
    #   Moderate: |change| 2–5% OR inventory unknown
    #   High:     |change| > 5% OR no price history at all
    if not has_price_history:
        volatility = "High"
    elif abs_change > 5:
        volatility = "High"
    elif abs_change > 2 or inventory_trend == "unknown":
        volatility = "Moderate"
    else:
        volatility = "Low"

    # ── Risk score 0–100 (higher = riskier) ──────────────────────────────────
    _vol_base = {"Low": 20, "Moderate": 50, "High": 75}
    risk_base = _vol_base[volatility]
    # Higher confidence → lower risk (subtract up to 15 points)
    conf_reduction = round((confidence_base - 50) / 50 * 15)
    risk_score = int(bound(risk_base - conf_reduction, 5, 95))

    # ── Uncertainty range (projected price ± sigma) ───────────────────────────
    _sigma = {"Low": 0.04, "Moderate": 0.08, "High": 0.14}
    sigma        = _sigma[volatility]
    proj_price   = forecast_90d if forecast_90d > 0 else predicted_price
    unc_low      = round(proj_price * (1 - sigma), 2)
    unc_high     = round(proj_price * (1 + sigma), 2)

    msg = (
        f"Volatility: {volatility}. Risk score: {risk_score}/100. "
        f"90d change: {change_pct:+.1f}%. "
        f"Uncertainty range: ${unc_low:,.0f} – ${unc_high:,.0f}."
    )

    return {
        "volatility_index":          volatility,
        "risk_score":                risk_score,
        "uncertainty_range":         {"low": unc_low, "high": unc_high},
        "predicted_90_day_change":   change_pct,
        "agent_log_entry": {
            "agent":   "RiskAssessmentAgent",
            "status":  "ok",
            "message": msg,
            "output": {
                "volatility_index":        volatility,
                "risk_score":              risk_score,
                "predicted_90_day_change": change_pct,
                "uncertainty_low":         unc_low,
                "uncertainty_high":        unc_high,
            },
        },
    }
