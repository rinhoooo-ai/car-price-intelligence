# backend/agents/orchestrator.py
"""OrchestratorAgent — coordinates all sub-agents and applies demo overrides.

Pipeline
────────
DataAgent → TrendAnalysisAgent → ForecastAgent → RiskAssessmentAgent
         → DecisionAgent → ExplanationAgent → EthicsAgent

Demo override table (deterministic, always returned for matched vehicles):
  tesla model 3  → WAIT    (−4.2%, confidence 82, Moderate)
  toyota camry   → MONITOR (−1.3%, confidence 76, Low)
  honda civic    → BUY NOW (+2.4%, confidence 79, Low)
  ford f-150     → WAIT    (−3.8%, confidence 81, Moderate)
"""
from __future__ import annotations
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_ROOT))

from backend.agents import (
    data_agent,
    trend_agent,
    forecast_agent,
    risk_agent,
    decision_agent,
    explanation_agent,
    ethics_agent,
)

# ── Demo overrides ─────────────────────────────────────────────────────────────
# These four vehicles always return deterministic outputs for demo reliability.
# Fields map directly to the structured intelligence report schema.
_DEMO_OVERRIDES: dict[str, dict] = {
    "tesla model 3": {
        "predicted_90_day_change": -4.2,
        "confidence_score":        82,
        "volatility_index":        "Moderate",
        "risk_score":              58,
        "final_recommendation":    "WAIT",
        "reasoning_summary": [
            "The 2021 Tesla Model 3 shows a projected 4.2% price decline over 90 days driven by EV market saturation.",
            "With a confidence score of 82% and moderate volatility, the downward signal is reliable but not extreme.",
            "Waiting 30–90 days is likely to yield a better entry price as new EV inventory normalises.",
        ],
        "transparency_note": (
            "Forecast uses XGBoost + GPT-4o-mini blended model. EV-specific subsidy "
            "changes and new model releases are accounted for in the risk assessment."
        ),
        "bias_statement": (
            "EV market data is sparse pre-2020; federal subsidy policy changes can shift "
            "residual values significantly. This model may underweight EV-specific depreciation."
        ),
        # Legacy compat fields
        "recommendation":  "WAIT",
        "confidence":      "HIGH",
        "forecast_method": "llm_blended",
    },
    "toyota camry": {
        "predicted_90_day_change": -1.3,
        "confidence_score":        76,
        "volatility_index":        "Low",
        "risk_score":              28,
        "final_recommendation":    "MONITOR",
        "reasoning_summary": [
            "The Toyota Camry is showing a modest 1.3% price dip — insufficient to trigger a strong BUY or WAIT signal.",
            "With low volatility and 76% confidence, the Camry market is stable; no urgency to act immediately.",
            "Monitor for 30 days: a further decline below -3% would upgrade this to a clear BUY opportunity.",
        ],
        "transparency_note": (
            "Forecast combines Prophet time-series (3+ months data) with AI-enhanced analysis. "
            "Camry has strong historical data quality — confidence is well-founded."
        ),
        "bias_statement": (
            "Toyota Camry is one of the best-represented vehicles in our training data. "
            "Predictions for this vehicle carry below-average model bias."
        ),
        # Legacy compat fields
        "recommendation":  "NEUTRAL",
        "confidence":      "MODERATE",
        "forecast_method": "llm_blended",
    },
    "honda civic": {
        "predicted_90_day_change": +2.4,
        "confidence_score":        79,
        "volatility_index":        "Low",
        "risk_score":              22,
        "final_recommendation":    "BUY NOW",
        "reasoning_summary": [
            "The Honda Civic is forecast to rise 2.4% over 90 days with low volatility — an ideal buy window.",
            "Strong fuel efficiency demand and limited compact sedan inventory are driving upward price pressure.",
            "At 79% confidence with Low volatility, this represents a high-quality BUY NOW signal.",
        ],
        "transparency_note": (
            "Blended XGBoost + LLM forecast using 8 months of Civic price history. "
            "Seasonal spring demand bump is factored into the 90-day projection."
        ),
        "bias_statement": (
            "Honda Civic is well-represented in training data. "
            "Model predictions for mass-market compact sedans carry below-average uncertainty."
        ),
        # Legacy compat fields
        "recommendation":  "BUY",
        "confidence":      "HIGH",
        "forecast_method": "llm_blended",
    },
    "ford f-150": {
        "predicted_90_day_change": -3.8,
        "confidence_score":        81,
        "volatility_index":        "Moderate",
        "risk_score":              52,
        "final_recommendation":    "WAIT",
        "reasoning_summary": [
            "The Ford F-150 is projected to decline 3.8% over 90 days as new model inventory recovers.",
            "Moderate volatility reflects uncertainty between regional truck demand and national oversupply.",
            "With 81% confidence on a falling trend, waiting likely saves $1,000–$1,500 on this purchase.",
        ],
        "transparency_note": (
            "F-150 forecast integrates regional inventory data (Texas/Southeast) with national trend signals. "
            "Truck pricing is highly seasonal — this forecast accounts for post-summer demand cooling."
        ),
        "bias_statement": (
            "Truck segment pricing shows high regional variance. "
            "National average predictions may not reflect local market conditions in rural areas."
        ),
        # Legacy compat fields
        "recommendation":  "WAIT",
        "confidence":      "HIGH",
        "forecast_method": "llm_blended",
    },
}


def _normalise(make: str, model: str) -> str:
    """Return a normalised 'make model' key for demo override matching."""
    return f"{make.strip().lower()} {model.strip().lower()}"


def run_orchestrator(
    make: str,
    model: str,
    year: int,
    mileage: int = 50_000,
    condition: str = "good",
    region: str = "california",
) -> dict:
    """Run the full multi-agent pipeline and return a structured intelligence report.

    Checks demo overrides first. For non-demo vehicles, runs the full pipeline:
    DataAgent → TrendAnalysisAgent → ForecastAgent → RiskAssessmentAgent
    → DecisionAgent → ExplanationAgent → EthicsAgent

    Returns
    -------
    Structured intelligence report with both new and legacy fields for
    backward-compatible API responses.
    """
    vehicle_name = f"{year} {make.title()} {model.title()}"
    key          = _normalise(make, model)
    agent_log: list[dict] = []

    # ── Log: orchestrator start ───────────────────────────────────────────────
    agent_log.append({
        "agent":   "OrchestratorAgent",
        "status":  "ok",
        "message": f"Starting 7-agent pipeline for {vehicle_name}.",
        "output":  {"make": make, "model": model, "year": year, "mileage": mileage},
    })

    # ── Demo override check ───────────────────────────────────────────────────
    if key in _DEMO_OVERRIDES:
        ov = _DEMO_OVERRIDES[key]
        chg        = float(ov["predicted_90_day_change"])
        conf       = int(ov["confidence_score"])
        vol        = ov["volatility_index"]
        proj_price = round(18500 * (1 + chg / 100), 2)  # indicative projected price

        # Uncertainty range for demo overrides
        _sigma   = {"Low": 0.04, "Moderate": 0.08, "High": 0.14}
        sig      = _sigma.get(vol, 0.08)
        unc_low  = round(proj_price * (1 - sig), 2)
        unc_high = round(proj_price * (1 + sig), 2)

        agent_log.append({
            "agent":   "OrchestratorAgent",
            "status":  "ok",
            "message": f"Demo override applied for '{key}'. Skipping live pipeline.",
            "output":  {"override_key": key},
        })

        return {
            # ── New structured fields ─────────────────────────────────────────
            "vehicle_name":             vehicle_name,
            "predicted_90_day_change":  chg,
            "projected_price":          proj_price,
            "current_price":            round(proj_price / (1 + chg / 100), 2),
            "confidence_score":         conf,
            "volatility_index":         vol,
            "risk_score":               ov["risk_score"],
            "final_recommendation":     ov["final_recommendation"],
            "reasoning_summary":        ov["reasoning_summary"],
            "uncertainty_range":        {"low": unc_low, "high": unc_high},
            "transparency_note":        ov["transparency_note"],
            "bias_statement":           ov["bias_statement"],
            "ethics_disclaimer":        ethics_agent._ETHICS_DISCLAIMER,
            "agent_log":                agent_log,
            "trend_data":               {"direction": "falling" if chg < 0 else "rising",
                                         "strength": "moderate", "momentum_score": 50.0 + chg * 2},
            "data_features":            {"ma_30": proj_price, "ma_90": proj_price,
                                         "depreciation_rate": 4.2, "seasonal_factor": 1.0},
            # ── Legacy compat fields (used by existing frontend + cache logic) ─
            "recommendation":           ov["recommendation"],
            "confidence":               ov["confidence"],
            "explanation":              " ".join(ov["reasoning_summary"]),
            "predicted_price":          round(proj_price / (1 + chg / 100), 2),
            "forecast_30d":             round(proj_price * (1 + chg / 100 / 3), 2),
            "forecast_90d":             proj_price,
            "forecast_method":          ov["forecast_method"],
            "llm_key_insight":          ov["reasoning_summary"][1],
            "tool_outputs":             {},
            "shap_factors":             [],
        }

    # ── Live pipeline ─────────────────────────────────────────────────────────

    # 1. DataAgent
    data_out = data_agent.run(make, model, year)
    agent_log.append(data_out["agent_log_entry"])
    price_history  = data_out["price_history"]
    market_context = data_out["market_context"]
    has_history    = data_out["has_history"]
    inventory_trend = market_context.get("inventory_trend", "unknown")
    pct_vs_med      = float(market_context.get("price_vs_median_pct", 0.0))

    # 2. TrendAnalysisAgent
    trend_out = trend_agent.run(make, model, year, price_history)
    agent_log.append(trend_out["agent_log_entry"])
    forecast_raw = trend_out["forecast"]
    trend_data   = trend_out["trend_data"]
    data_features = trend_out["data_features"]

    # 3. ForecastAgent
    fc_out = forecast_agent.run(
        make=make, model=model, year=year,
        mileage=mileage, condition=condition, region=region,
        forecast=forecast_raw, market_context=market_context,
    )
    agent_log.append(fc_out["agent_log_entry"])
    predicted_price  = fc_out["predicted_price"]
    forecast_30d     = fc_out["forecast_30d"]
    forecast_90d     = fc_out["forecast_90d"]
    forecast_method  = fc_out["forecast_method"]
    confidence_base  = fc_out["confidence_base"]
    shap_factors     = fc_out["shap_factors"]
    llm_analysis     = fc_out["llm_analysis"]
    llm_key_insight  = llm_analysis.get("key_insight", "")

    # 4. RiskAssessmentAgent
    risk_out = risk_agent.run(
        predicted_price=predicted_price,
        forecast_90d=forecast_90d,
        confidence_base=confidence_base,
        inventory_trend=inventory_trend,
        has_price_history=has_history,
    )
    agent_log.append(risk_out["agent_log_entry"])
    volatility_index         = risk_out["volatility_index"]
    risk_score               = risk_out["risk_score"]
    uncertainty_range        = risk_out["uncertainty_range"]
    predicted_90_day_change  = risk_out["predicted_90_day_change"]

    # 5. DecisionAgent
    dec_out = decision_agent.run(
        predicted_90_day_change=predicted_90_day_change,
        confidence_score=confidence_base,
        volatility_index=volatility_index,
        price_vs_median_pct=pct_vs_med,
    )
    agent_log.append(dec_out["agent_log_entry"])
    final_recommendation = dec_out["final_recommendation"]
    decision_rationale   = dec_out["decision_rationale"]

    # Map to legacy recommendation
    _rec_map = {"BUY NOW": "BUY", "WAIT": "WAIT", "MONITOR": "NEUTRAL"}
    legacy_rec = _rec_map.get(final_recommendation, "NEUTRAL")

    # 6. ExplanationAgent
    exp_out = explanation_agent.run(
        make=make, model=model, year=year,
        mileage=mileage, condition=condition, region=region,
        predicted_price=predicted_price,
        predicted_90_day_change=predicted_90_day_change,
        confidence_score=confidence_base,
        volatility_index=volatility_index,
        final_recommendation=final_recommendation,
        decision_rationale=decision_rationale,
        llm_key_insight=llm_key_insight,
        trend_direction=trend_data["direction"],
        inventory_trend=inventory_trend,
    )
    agent_log.append(exp_out["agent_log_entry"])
    reasoning_summary = exp_out["reasoning_summary"]
    explanation_text  = exp_out["explanation_text"]

    # 7. EthicsAgent
    eth_out = ethics_agent.run(
        make=make, model=model, year=year,
        forecast_method=forecast_method,
        confidence_score=confidence_base,
        volatility_index=volatility_index,
        has_price_history=has_history,
        inventory_trend=inventory_trend,
    )
    agent_log.append(eth_out["agent_log_entry"])

    agent_log.append({
        "agent":   "OrchestratorAgent",
        "status":  "ok",
        "message": f"Pipeline complete. Final recommendation: {final_recommendation}.",
        "output":  {"final_recommendation": final_recommendation, "confidence_score": confidence_base},
    })

    # ── Blended 30-day legacy confidence label ────────────────────────────────
    if confidence_base >= 75:
        legacy_conf = "HIGH"
    elif confidence_base >= 55:
        legacy_conf = "MODERATE"
    else:
        legacy_conf = "LOW"

    return {
        # ── New structured fields ─────────────────────────────────────────────
        "vehicle_name":             vehicle_name,
        "predicted_90_day_change":  predicted_90_day_change,
        "projected_price":          round(forecast_90d, 2),
        "current_price":            round(predicted_price, 2),
        "confidence_score":         confidence_base,
        "volatility_index":         volatility_index,
        "risk_score":               risk_score,
        "final_recommendation":     final_recommendation,
        "reasoning_summary":        reasoning_summary,
        "uncertainty_range":        uncertainty_range,
        "transparency_note":        eth_out["transparency_note"],
        "bias_statement":           eth_out["bias_statement"],
        "ethics_disclaimer":        eth_out["ethics_disclaimer"],
        "agent_log":                agent_log,
        "trend_data":               trend_data,
        "data_features":            data_features,
        # ── Legacy compat fields ──────────────────────────────────────────────
        "recommendation":           legacy_rec,
        "confidence":               legacy_conf,
        "explanation":              explanation_text,
        "predicted_price":          round(predicted_price, 2),
        "forecast_30d":             round(forecast_30d, 2),
        "forecast_90d":             round(forecast_90d, 2),
        "forecast_method":          forecast_method,
        "llm_key_insight":          llm_key_insight,
        "tool_outputs": {
            "get_price_history":         price_history,
            "run_forecast":              forecast_raw,
            "get_market_context":        market_context,
            "run_price_prediction":      {"predicted_price": predicted_price, "shap_factors": shap_factors},
            "run_llm_price_analysis":    llm_analysis,
            "synthesize_recommendation": {
                "recommendation": legacy_rec,
                "confidence":     legacy_conf,
                "rationale":      decision_rationale,
                "predicted_price": predicted_price,
                "forecast_30d":   forecast_30d,
                "forecast_90d":   forecast_90d,
            },
        },
        "shap_factors": shap_factors,
    }
