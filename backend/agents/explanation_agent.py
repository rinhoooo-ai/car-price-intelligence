# backend/agents/explanation_agent.py
"""ExplanationAgent — GPT-4o-mini generates a 3-sentence reasoning summary."""
from __future__ import annotations
import json, os, sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_ROOT))
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(_ROOT / ".env")
_oai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
MODEL = "gpt-4o-mini"


def run(
    make: str,
    model: str,
    year: int,
    mileage: int,
    condition: str,
    region: str,
    predicted_price: float,
    predicted_90_day_change: float,
    confidence_score: int,
    volatility_index: str,
    final_recommendation: str,
    decision_rationale: str,
    llm_key_insight: str,
    trend_direction: str,
    inventory_trend: str,
) -> dict:
    """Generate a 3-bullet reasoning summary using GPT-4o-mini.

    Falls back to a deterministic template if the LLM call fails.

    Returns
    -------
    {
        "reasoning_summary": ["sentence 1", "sentence 2", "sentence 3"],
        "explanation_text": str,   # legacy flat explanation string
        "agent_log_entry": {...},
    }
    """
    prompt = (
        f"You are a car market analyst. Summarise this analysis in exactly 3 concise bullet sentences.\n\n"
        f"Vehicle: {year} {make.title()} {model.title()}\n"
        f"Details: {mileage:,} miles | {condition} condition | {region}\n"
        f"Prediction: ${predicted_price:,.0f} fair value\n"
        f"90-day forecast: {predicted_90_day_change:+.1f}% change\n"
        f"Confidence: {confidence_score}% | Volatility: {volatility_index}\n"
        f"Market trend: {trend_direction} | Inventory: {inventory_trend}\n"
        f"Recommendation: {final_recommendation}\n"
        f"Key insight: {llm_key_insight or decision_rationale}\n\n"
        f"Respond with ONLY valid JSON: "
        f'{{ "reasoning": ["sentence1", "sentence2", "sentence3"] }}\n'
        f"Each sentence must be direct, cite specific numbers, and be ≤ 25 words."
    )

    try:
        resp = _oai.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are an expert automotive analyst. Return JSON only."},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        data    = json.loads(resp.choices[0].message.content)
        bullets = data.get("reasoning", [])
        if isinstance(bullets, list) and len(bullets) >= 3:
            summary = [str(b) for b in bullets[:3]]
        else:
            raise ValueError("Unexpected LLM response shape")
    except Exception:
        # Deterministic fallback
        direction_word = "rise" if predicted_90_day_change > 0 else "fall"
        summary = [
            f"Fair market value for this {year} {make.title()} {model.title()} is ${predicted_price:,.0f}.",
            f"Prices are forecast to {direction_word} {abs(predicted_90_day_change):.1f}% over 90 days with {confidence_score}% confidence.",
            decision_rationale,
        ]

    explanation_text = " ".join(summary)

    msg = f"Generated 3-sentence reasoning for {final_recommendation} recommendation."

    return {
        "reasoning_summary": summary,
        "explanation_text":  explanation_text,
        "agent_log_entry": {
            "agent":   "ExplanationAgent",
            "status":  "ok",
            "message": msg,
            "output":  {"reasoning_summary": summary},
        },
    }
