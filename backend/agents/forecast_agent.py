# backend/agents/forecast_agent.py
"""ForecastAgent — blends XGBoost + LLM price predictions into final forecasts."""
from __future__ import annotations
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_ROOT))
from backend.agent import run_price_prediction, run_llm_price_analysis


def run(
    make: str,
    model: str,
    year: int,
    mileage: int,
    condition: str,
    region: str,
    forecast: dict,
    market_context: dict,
) -> dict:
    """Run XGBoost inference then blend with LLM-enhanced price analysis.

    Returns
    -------
    {
        "predicted_price": float,
        "forecast_30d": float,
        "forecast_90d": float,
        "forecast_method": str,
        "confidence_base": int,      # base confidence 0-100 before adjustments
        "shap_factors": [...],
        "llm_analysis": {...},
        "agent_log_entry": {...},
    }
    """
    # ── XGBoost inference ─────────────────────────────────────────────────────
    xgb_result = run_price_prediction(make, model, year, mileage, condition, region)
    predicted_price = float(xgb_result.get("predicted_price", 0.0))
    shap_factors    = xgb_result.get("shap_factors", [])

    # ── LLM analysis ──────────────────────────────────────────────────────────
    stat_30d     = float(forecast.get("forecast_30d", predicted_price))
    stat_90d     = float(forecast.get("forecast_90d", predicted_price))
    trend_dir    = forecast.get("trend_direction", "stable")
    trend_pct    = float(forecast.get("trend_pct_change", 0.0))
    inv_trend    = market_context.get("inventory_trend", "unknown")
    pct_vs_med   = float(market_context.get("price_vs_median_pct", 0.0))

    llm_analysis = run_llm_price_analysis(
        make=make, model=model, year=year,
        mileage=mileage, condition=condition, region=region,
        current_price=predicted_price,
        stat_forecast_30d=stat_30d,
        stat_forecast_90d=stat_90d,
        trend_direction=trend_dir,
        trend_pct_30d=trend_pct,
        inventory_trend=inv_trend,
        price_vs_median_pct=pct_vs_med,
    )

    # ── Blend: 40% statistical + 60% LLM for 30d; 30/70 for 90d ─────────────
    llm_30d = float(llm_analysis.get("forecast_30d", stat_30d))
    llm_90d = float(llm_analysis.get("forecast_90d", stat_90d))

    if llm_30d > 0 and stat_30d > 0:
        blended_30d     = round(0.4 * stat_30d + 0.6 * llm_30d, 2)
        blended_90d     = round(0.3 * stat_90d + 0.7 * llm_90d, 2)
        forecast_method = "llm_blended"
    else:
        blended_30d     = round(stat_30d, 2)
        blended_90d     = round(stat_90d, 2)
        forecast_method = forecast.get("method", "statistical")

    # ── Base confidence from forecast method ──────────────────────────────────
    _method_conf = {
        "prophet":          80,
        "llm_blended":      78,
        "linear":           72,
        "statistical":      75,
        "market_avg":       68,
        "industry_default": 58,
    }
    raw_method  = forecast.get("method", "market_avg")
    conf_base   = _method_conf.get(raw_method, 65)

    # Adjust for LLM agreement on trend direction
    llm_dir = llm_analysis.get("trend_direction", trend_dir)
    if llm_dir == trend_dir:
        conf_base = min(99, conf_base + 5)
    else:
        conf_base = max(10, conf_base - 5)

    # Adjust for best_time_to_buy signal
    btb = llm_analysis.get("best_time_to_buy", "neutral")
    if btb in ("now", "30_days"):
        conf_base = min(99, conf_base + 3)

    msg = (
        f"XGBoost: ${predicted_price:,.0f}. "
        f"Blended 30d: ${blended_30d:,.0f} / 90d: ${blended_90d:,.0f} ({forecast_method}). "
        f"Base confidence: {conf_base}."
    )

    return {
        "predicted_price":  predicted_price,
        "forecast_30d":     blended_30d,
        "forecast_90d":     blended_90d,
        "forecast_method":  forecast_method,
        "confidence_base":  conf_base,
        "shap_factors":     shap_factors,
        "llm_analysis":     llm_analysis,
        "agent_log_entry": {
            "agent":   "ForecastAgent",
            "status":  "ok",
            "message": msg,
            "output": {
                "predicted_price":  predicted_price,
                "forecast_30d":     blended_30d,
                "forecast_90d":     blended_90d,
                "forecast_method":  forecast_method,
                "confidence_base":  conf_base,
                "llm_best_time":    btb,
            },
        },
    }
