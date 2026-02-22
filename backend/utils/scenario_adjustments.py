# backend/utils/scenario_adjustments.py
"""Scenario simulation multipliers used by the ScenarioPanel in the frontend."""
from __future__ import annotations

# Each scenario key maps to a dict of multipliers applied to the 90-day forecast.
# multiplier > 1 → prices rise; < 1 → prices fall
SCENARIO_MULTIPLIERS: dict[str, dict[str, float]] = {
    "interest_rate_hike": {
        "price_change_pct_delta": -2.5,   # rising rates → lower demand → prices fall ~2.5%
        "confidence_delta": -3,
        "label": "Interest Rate Hike",
        "description": "Fed raises rates by 0.5%: reduces buyer purchasing power.",
    },
    "fuel_spike": {
        "price_change_pct_delta": -1.8,   # gas cars slightly less desirable
        "confidence_delta": -2,
        "label": "Fuel Price Spike",
        "description": "Gas prices surge 30%: mild shift away from ICE vehicles.",
    },
    "ev_subsidy": {
        "price_change_pct_delta": +1.5,   # EV subsidy increases EV resale demand
        "confidence_delta": +2,
        "label": "EV Federal Subsidy",
        "description": "New $4,000 used-EV tax credit: boosts EV resale demand.",
    },
    "supply_chain": {
        "price_change_pct_delta": +3.2,   # supply crunch → new car shortage → used prices rise
        "confidence_delta": -4,
        "label": "Supply Chain Crunch",
        "description": "Chip shortage cuts new car production: used prices spike.",
    },
}


def apply_scenario(
    base_change_pct: float,
    base_confidence: int,
    scenario_key: str,
) -> dict:
    """Apply a named scenario to a base 90-day forecast.

    Returns adjusted ``price_change_pct`` and ``confidence_score``.
    """
    if scenario_key not in SCENARIO_MULTIPLIERS:
        return {"price_change_pct": base_change_pct, "confidence_score": base_confidence}

    s = SCENARIO_MULTIPLIERS[scenario_key]
    new_pct  = round(base_change_pct + s["price_change_pct_delta"], 2)
    new_conf = int(max(10, min(99, base_confidence + s["confidence_delta"])))
    return {
        "price_change_pct": new_pct,
        "confidence_score": new_conf,
        "label":            s["label"],
        "description":      s["description"],
    }
