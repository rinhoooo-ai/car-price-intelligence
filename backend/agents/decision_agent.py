# backend/agents/decision_agent.py
"""DecisionAgent — three-rule deterministic decision engine."""
from __future__ import annotations


def run(
    predicted_90_day_change: float,
    confidence_score: int,
    volatility_index: str,
    price_vs_median_pct: float,
) -> dict:
    """Apply structured decision rules to produce a final recommendation.

    Rules (in priority order)
    ─────────────────────────
    1. WAIT    : change ≤ -3% AND confidence ≥ 75
    2. BUY NOW : change ≥ +2% AND volatility == "Low"
    3. BUY NOW : price ≤ -10% vs market median AND confidence ≥ 75 (strong deal)
    4. MONITOR : everything else

    Returns
    -------
    {
        "final_recommendation": "BUY NOW" | "WAIT" | "MONITOR",
        "decision_rationale": str,
        "agent_log_entry": {...},
    }
    """
    change  = float(predicted_90_day_change)
    conf    = int(confidence_score)
    vol     = volatility_index
    pct_med = float(price_vs_median_pct)

    if change <= -3.0 and conf >= 75:
        rec = "WAIT"
        rationale = (
            f"Prices projected to fall {abs(change):.1f}% over 90 days "
            f"(confidence {conf}%). Waiting likely saves money."
        )
    elif change >= 2.0 and vol == "Low":
        rec = "BUY NOW"
        rationale = (
            f"Prices rising {change:.1f}% with low volatility — "
            f"a stable upward trend signals a good time to buy."
        )
    elif pct_med <= -10.0 and conf >= 75:
        rec = "BUY NOW"
        rationale = (
            f"Listing is {abs(pct_med):.1f}% below market median — "
            f"a compelling value deal with {conf}% confidence."
        )
    else:
        rec = "MONITOR"
        rationale = (
            f"No strong buy or sell signal: {change:+.1f}% projected change, "
            f"{vol} volatility. Continue monitoring for a better entry point."
        )

    msg = f"Decision: {rec}. {rationale}"

    return {
        "final_recommendation": rec,
        "decision_rationale":   rationale,
        "agent_log_entry": {
            "agent":   "DecisionAgent",
            "status":  "ok",
            "message": msg,
            "output": {
                "final_recommendation":    rec,
                "predicted_90_day_change": change,
                "confidence_score":        conf,
                "volatility_index":        vol,
            },
        },
    }
