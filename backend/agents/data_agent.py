# backend/agents/data_agent.py
"""DataAgent — fetches price history and market context from MongoDB."""
from __future__ import annotations
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_ROOT))
from backend.agent import get_price_history, get_market_context


def run(make: str, model: str, year: int) -> dict:
    """Fetch price history and market context for the given vehicle.

    Returns
    -------
    {
        "price_history": [...],
        "market_context": {...},
        "has_history": bool,
        "agent_log_entry": {"agent": "DataAgent", "message": str, "output": dict},
    }
    """
    price_history  = get_price_history(make, model, year)
    market_context = get_market_context(make, model, year)

    has_history = bool(price_history) and "error" not in price_history[0]
    n_months    = len(price_history) if has_history else 0

    if has_history:
        msg = f"Retrieved {n_months} months of price history for {year} {make.title()} {model.title()}."
    else:
        msg = f"No price history found for {year} {make.title()} {model.title()} — using market-wide fallback."

    return {
        "price_history":  price_history,
        "market_context": market_context,
        "has_history":    has_history,
        "n_months":       n_months,
        "agent_log_entry": {
            "agent":   "DataAgent",
            "status":  "ok" if has_history else "fallback",
            "message": msg,
            "output": {
                "n_months":           n_months,
                "inventory_count":    market_context.get("current_inventory_count", 0),
                "inventory_trend":    market_context.get("inventory_trend", "unknown"),
                "price_vs_median":    market_context.get("price_vs_median_pct", 0.0),
            },
        },
    }
