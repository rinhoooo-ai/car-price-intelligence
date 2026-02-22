# backend/agents/trend_agent.py
"""TrendAnalysisAgent — derives trend metrics from forecast output."""
from __future__ import annotations
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_ROOT))
from backend.agent import run_forecast
from backend.utils.smoothing import moving_average, bound


def run(make: str, model: str, year: int, price_history: list[dict]) -> dict:
    """Run statistical forecast and derive trend metrics.

    Returns
    -------
    {
        "forecast": {...},          # raw output from run_forecast
        "trend_data": {
            "direction": str,
            "strength": str,
            "momentum_score": float,
        },
        "data_features": {
            "ma_30": float,
            "ma_90": float,
            "depreciation_rate": float,
            "seasonal_factor": float,
        },
        "agent_log_entry": {...},
    }
    """
    forecast = run_forecast(make, model, year)

    trend_pct   = float(forecast.get("trend_pct_change", 0.0))
    trend_90d   = float(forecast.get("trend_pct_90d", 0.0))
    direction   = forecast.get("trend_direction", "stable")
    method      = forecast.get("method", "market_avg")

    # Strength classification
    abs_pct = abs(trend_pct)
    if abs_pct >= 3:
        strength = "strong"
    elif abs_pct >= 1:
        strength = "moderate"
    else:
        strength = "weak"

    # Momentum score: 0–100 (50 = flat market)
    momentum_score = round(bound(50 + trend_pct * 5, 0, 100), 1)

    # ── Data features from price history ─────────────────────────────────────
    prices = []
    if price_history and "error" not in price_history[0]:
        prices = [float(p.get("avg_price", 0)) for p in price_history if p.get("avg_price")]

    last_price = float(forecast.get("last_known_price", 0))
    fc_30      = float(forecast.get("forecast_30d", last_price or 18500))
    fc_90      = float(forecast.get("forecast_90d", last_price or 18500))

    if prices and len(prices) >= 3:
        ma_30 = round(moving_average(prices, 3)[-1], 2)
        ma_90 = round(moving_average(prices, min(9, len(prices)))[-1], 2)
    else:
        ma_30 = round(fc_30, 2)
        ma_90 = round(fc_90, 2)

    # Annualised depreciation rate (positive = depreciation)
    if last_price > 0 and len(prices) >= 2:
        oldest = prices[0]
        n_years = len(prices) / 12
        depreciation_rate = round((oldest - last_price) / oldest / max(n_years, 1) * 100, 2)
    else:
        depreciation_rate = 0.0

    # Seasonal factor: current month price vs 3-month MA (> 1 = above seasonal avg)
    seasonal_factor = round(last_price / ma_90, 3) if ma_90 > 0 else 1.0

    msg = (
        f"Forecast method: {method}. "
        f"Trend: {direction} ({trend_pct:+.1f}% / 30d). "
        f"Momentum score: {momentum_score}/100."
    )

    return {
        "forecast": forecast,
        "trend_data": {
            "direction":      direction,
            "strength":       strength,
            "momentum_score": momentum_score,
        },
        "data_features": {
            "ma_30":             ma_30,
            "ma_90":             ma_90,
            "depreciation_rate": depreciation_rate,
            "seasonal_factor":   seasonal_factor,
        },
        "agent_log_entry": {
            "agent":   "TrendAnalysisAgent",
            "status":  "ok",
            "message": msg,
            "output": {
                "direction":      direction,
                "strength":       strength,
                "momentum_score": momentum_score,
                "method":         method,
                "trend_pct_30d":  trend_pct,
                "trend_pct_90d":  trend_90d,
            },
        },
    }
