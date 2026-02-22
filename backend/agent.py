"""
agent.py — Car Market Analyst Agent
Uses OpenAI GPT-4o-mini with tool-calling to analyse a car query and return
a structured BUY / WAIT / NEUTRAL recommendation with a plain-English explanation.

Tools (called by the LLM in order):
  1. get_price_history        → MongoDB price_snapshots time series
  2. run_forecast             → Prophet 30 / 90-day price forecast
  3. run_price_prediction     → XGBoost inference + top-3 SHAP factors
  4. get_market_context       → Inventory count, trend, regional range
  5. run_llm_price_analysis   → GPT-4o-mini enhanced 30/90-day forecast (blends
                                statistical + AI reasoning for better accuracy)
  6. synthesize_recommendation → Rule-based BUY/WAIT/NEUTRAL (not an LLM call)

Environment variables required (.env):
  OPENAI_API_KEY
  MONGO_URI
"""

from __future__ import annotations

import json
import os
import sys
import warnings
warnings.filterwarnings("ignore")          # suppress XGBoost GPU/CPU device warnings
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from openai import OpenAI
from pymongo import MongoClient

# ── Project imports ───────────────────────────────────────────────────────────
_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(_ROOT))
from scripts.model_utils import predict_price, explain_prediction

# ── Bootstrap ─────────────────────────────────────────────────────────────────
load_dotenv(_ROOT / ".env")

_oai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
_db  = MongoClient(os.environ["MONGO_URI"])["carmarket"]

MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = (
    "You are a car market analyst. When given a car query, call these tools IN ORDER:\n"
    "1. get_price_history  → fetch historical price data from MongoDB\n"
    "2. run_forecast       → get statistical 30/90-day price forecast\n"
    "3. run_price_prediction → get XGBoost fair market value and SHAP factors\n"
    "4. get_market_context → get inventory count and market position\n"
    "5. run_llm_price_analysis → pass current_price from step 3, "
    "stat_forecast_30d/90d from step 2, trend info from steps 2+4 to get enhanced AI forecast\n"
    "6. synthesize_recommendation → pass ALL data including llm_forecast_30d/90d "
    "from step 5 to generate the final BUY/WAIT/NEUTRAL signal\n"
    "Then write a 3-sentence plain English explanation citing specific $ numbers. "
    "Be direct. Do not hedge excessively."
)


# ══════════════════════════════════════════════════════════════════════════════
# Tool implementations
# ══════════════════════════════════════════════════════════════════════════════

def get_price_history(make: str, model: str, year: int) -> list[dict]:
    """Query MongoDB price_snapshots for (make, model, year) time series."""
    cursor = _db["price_snapshots"].find(
        {"make": make.lower(), "model": model.lower(), "year": year},
        {"_id": 0, "year_month": 1, "avg_price": 1, "median_price": 1, "listing_count": 1},
    ).sort("year_month", 1)

    history = [
        {
            "date":          doc["year_month"],
            "avg_price":     round(doc.get("avg_price", 0), 2),
            "median_price":  round(doc.get("median_price", 0), 2),
            "listing_count": doc.get("listing_count", 0),
        }
        for doc in cursor
    ]
    return history if history else [{"error": f"No price history for {year} {make} {model}"}]


def _market_trend_forecast() -> dict:
    """
    Fallback: derive a forecast from the most recent global price_snapshots
    (all makes/models combined).  Used when a specific car has no history.
    Falls back to US used-car industry averages when DB has no data.
    """
    recent = list(
        _db["price_snapshots"]
        .find({}, {"_id": 0, "year_month": 1, "avg_price": 1})
        .sort("year_month", -1)
        .limit(3)
    )

    # Industry default when DB has no global data
    if len(recent) == 0:
        last_price = 18500.0   # US median used car price
        mom_rate   = 0.003     # ~3.6% annual appreciation
        return {
            "last_known_price": last_price,
            "forecast_30d":     round(last_price * (1 + mom_rate), 2),
            "forecast_90d":     round(last_price * (1 + mom_rate * 3), 2),
            "trend_direction":  "rising",
            "trend_pct_change": round(mom_rate * 100, 2),
            "trend_pct_90d":    round(mom_rate * 3 * 100, 2),
            "seasonality_note": "Industry default estimate (no market data in DB yet)",
            "method":           "industry_default",
        }

    last_price = float(recent[0]["avg_price"])

    if len(recent) < 2:
        mom_rate = 0.003
    else:
        prev_price = float(recent[1]["avg_price"])
        mom_rate   = (last_price - prev_price) / prev_price if prev_price else 0.003

    fc_30  = round(last_price * (1 + mom_rate), 2)
    fc_90  = round(last_price * (1 + mom_rate * 3), 2)
    pct_30 = round(mom_rate * 100, 2)

    return {
        "last_known_price": round(last_price, 2),
        "forecast_30d":     fc_30,
        "forecast_90d":     fc_90,
        "trend_direction":  "rising" if pct_30 > 0 else "falling",
        "trend_pct_change": pct_30,
        "trend_pct_90d":    round(mom_rate * 3 * 100, 2),
        "seasonality_note": "Market-wide trend estimate (no model-specific price history in DB)",
        "method":           "market_avg",
    }


def run_forecast(make: str, model: str, year: int) -> dict:
    """
    Fetch price history from MongoDB then run Facebook Prophet.
    Accepts make/model/year directly so the LLM doesn't need to pipe
    raw data between tool calls.

    Fallback chain:
      0 months of car data  → market-wide average trend (or industry default)
      1–2 months            → linear extrapolation
      3+ months             → Prophet time-series model
    """
    try:
        from prophet import Prophet  # lazy import — heavy dep
    except ImportError:
        return {"error": "prophet not installed. Run: pip install prophet"}

    price_history = get_price_history(make, model, year)
    has_car_data  = price_history and "error" not in price_history[0]

    # ── No car-specific data → fall back to market-wide trend ────────────────
    if not has_car_data:
        return _market_trend_forecast()

    df = pd.DataFrame(price_history)
    df["ds"] = pd.to_datetime(df["date"], format="%Y-%m", errors="coerce")
    df["y"]  = pd.to_numeric(df["avg_price"], errors="coerce")
    df = df.dropna(subset=["ds", "y"])

    if len(df) == 0:
        return _market_trend_forecast()

    # ── Linear fallback for sparse data (1–2 months) ─────────────────────────
    if len(df) < 3:
        last_price  = float(df["y"].iloc[-1])
        first_price = float(df["y"].iloc[0])
        n_months    = max(1, len(df) - 1)
        mom_rate    = (last_price - first_price) / first_price / n_months  # per-month rate

        fc_30 = round(last_price * (1 + mom_rate), 2)
        fc_90 = round(last_price * (1 + mom_rate * 3), 2)
        pct_30 = round(mom_rate * 100, 2)

        return {
            "last_known_price":  round(last_price, 2),
            "forecast_30d":      fc_30,
            "forecast_90d":      fc_90,
            "trend_direction":   "rising" if pct_30 > 0 else "falling",
            "trend_pct_change":  pct_30,
            "trend_pct_90d":     round(mom_rate * 3 * 100, 2),
            "seasonality_note":  "Linear extrapolation (only 2 months of data — Prophet needs ≥ 3)",
            "method":            "linear",
        }

    m = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        changepoint_prior_scale=0.3,
    )
    m.fit(df[["ds", "y"]])

    future   = m.make_future_dataframe(periods=90, freq="D")
    forecast = m.predict(future)

    last_price = float(df["y"].iloc[-1])
    last_date  = df["ds"].max()

    def _price_at(days: int) -> float:
        target = last_date + timedelta(days=days)
        idx    = (forecast["ds"] - target).abs().idxmin()
        return round(float(forecast.loc[idx, "yhat"]), 2)

    fc_30 = _price_at(30)
    fc_90 = _price_at(90)

    pct_30 = round((fc_30 - last_price) / last_price * 100, 2)
    pct_90 = round((fc_90 - last_price) / last_price * 100, 2)

    # Seasonality note: find the month with the highest yhat in the next 90 days
    future_fc = forecast[forecast["ds"] > last_date].copy()
    peak_month = future_fc.loc[future_fc["yhat"].idxmax(), "ds"].strftime("%B")

    return {
        "last_known_price":   round(last_price, 2),
        "forecast_30d":       fc_30,
        "forecast_90d":       fc_90,
        "trend_direction":    "rising" if pct_30 > 0 else "falling",
        "trend_pct_change":   pct_30,
        "trend_pct_90d":      pct_90,
        "seasonality_note":   f"Prices expected to peak around {peak_month} in the forecast window",
        "method":             "prophet",
    }


def run_price_prediction(
    make: str,
    model: str,
    year: int,
    mileage: int,
    condition: str,
    region: str,
) -> dict:
    """Load XGBoost model, predict price, return top-3 SHAP factors."""
    row = {
        "make":        make.lower(),
        "model":       model.lower(),
        "year":        year,
        "odometer":    mileage,
        "condition":   condition.lower(),
        "region":      region.lower(),
        "fuel":        "gas",          # reasonable default
        "transmission": "automatic",
        "drive":       "fwd",
        "type":        "sedan",
        "title_status": "clean",
        "cylinders":   "4 cylinders",
        "paint_color": "white",
        "state":       region[:2].lower(),
    }
    predicted = predict_price(row)
    shap_factors = explain_prediction(row)

    return {
        "predicted_price": round(predicted, 2),
        "shap_factors":    shap_factors,   # [{feature, value, impact, direction}]
    }


def get_market_context(make: str, model: str, year: int) -> dict:
    """Return inventory count, trend, price-vs-median, and regional range."""
    make_l  = make.lower()
    model_l = model.lower()
    filter_ = {"make": make_l, "model": model_l, "year": year}

    # Current listing count from listings collection
    total_count = _db["listings"].count_documents(filter_)

    # Inventory trend: compare snapshot listing_count across most recent 2 periods
    recent = list(
        _db["price_snapshots"]
        .find(filter_, {"_id": 0, "year_month": 1, "listing_count": 1, "avg_price": 1})
        .sort("year_month", -1)
        .limit(2)
    )

    inventory_trend = "unknown"
    price_vs_median_pct = 0.0
    if len(recent) == 2:
        curr_cnt  = recent[0].get("listing_count", 0)
        prev_cnt  = recent[1].get("listing_count", 1)
        inventory_trend = "rising" if curr_cnt >= prev_cnt else "falling"

    # Overall median price for this make/model/year
    pipeline = [
        {"$match": filter_},
        {"$group": {
            "_id": None,
            "overall_avg": {"$avg": "$avg_price"},
            "min_price":   {"$min": "$avg_price"},
            "max_price":   {"$max": "$avg_price"},
        }},
    ]
    agg = list(_db["price_snapshots"].aggregate(pipeline))
    if agg:
        overall_avg = agg[0]["overall_avg"] or 0
        min_price   = round(agg[0]["min_price"], 2)
        max_price   = round(agg[0]["max_price"], 2)
        # latest avg vs overall avg → negative means currently below market
        latest_avg  = recent[0].get("avg_price", overall_avg) if recent else overall_avg
        price_vs_median_pct = round((latest_avg - overall_avg) / overall_avg * 100, 2) if overall_avg else 0.0
    else:
        min_price = max_price = 0.0

    return {
        "current_inventory_count": total_count,
        "inventory_trend":         inventory_trend,
        "price_vs_median_pct":     price_vs_median_pct,   # negative = below market (good deal)
        "regional_price_range":    {"min": min_price, "max": max_price},
    }


def run_llm_price_analysis(
    make: str,
    model: str,
    year: int,
    mileage: int,
    condition: str,
    region: str,
    current_price: float,
    stat_forecast_30d: float,
    stat_forecast_90d: float,
    trend_direction: str,
    trend_pct_30d: float,
    inventory_trend: str,
    price_vs_median_pct: float,
) -> dict:
    """
    GPT-4o-mini powered price analysis that synthesises all available data
    (XGBoost value, statistical forecast, inventory signals) to produce
    AI-enhanced 30 and 90-day price forecasts.

    Returns blended forecast values, a trend call, confidence, key insight,
    and a best-time-to-buy signal — all used by synthesize_recommendation.
    """
    current_month = datetime.now().strftime("%B")
    prompt = (
        f"You are an expert automotive market analyst. Analyse this used car and forecast prices.\n\n"
        f"Vehicle: {year} {make.title()} {model.title()}\n"
        f"Details: {mileage:,} miles | {condition} condition | {region} region\n"
        f"Current month: {current_month}\n\n"
        f"Data inputs:\n"
        f"  XGBoost fair market value : ${current_price:,.0f}\n"
        f"  Statistical 30-day forecast: ${stat_forecast_30d:,.0f} ({trend_pct_30d:+.1f}%)\n"
        f"  Statistical 90-day forecast: ${stat_forecast_90d:,.0f}\n"
        f"  Market trend              : {trend_direction}\n"
        f"  Inventory trend           : {inventory_trend}\n"
        f"  Price vs market median    : {price_vs_median_pct:+.1f}%\n\n"
        f"Consider: typical depreciation for this make/model age, seasonal demand patterns, "
        f"regional supply, and whether the statistical forecast seems reasonable.\n\n"
        f"Respond with ONLY valid JSON:\n"
        f'{{\n'
        f'  "forecast_30d": <number — your best predicted price in 30 days>,\n'
        f'  "forecast_90d": <number — your best predicted price in 90 days>,\n'
        f'  "trend_direction": "rising" | "falling" | "stable",\n'
        f'  "confidence": "HIGH" | "MODERATE" | "LOW",\n'
        f'  "key_insight": "<one concise sentence about the most important price driver>",\n'
        f'  "best_time_to_buy": "now" | "30_days" | "90_days" | "wait"\n'
        f'}}'
    )

    try:
        resp = _oai.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are an expert automotive market analyst. Always respond with valid JSON only."},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.15,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        return {
            "forecast_30d":       float(data.get("forecast_30d", stat_forecast_30d)),
            "forecast_90d":       float(data.get("forecast_90d", stat_forecast_90d)),
            "trend_direction":    str(data.get("trend_direction", trend_direction)),
            "confidence":         str(data.get("confidence", "MODERATE")),
            "key_insight":        str(data.get("key_insight", "")),
            "best_time_to_buy":   str(data.get("best_time_to_buy", "neutral")),
            "method":             "llm_analysis",
        }
    except Exception as exc:
        # Graceful fallback — return statistical values so the pipeline continues
        return {
            "forecast_30d":     stat_forecast_30d,
            "forecast_90d":     stat_forecast_90d,
            "trend_direction":  trend_direction,
            "confidence":       "LOW",
            "key_insight":      f"LLM analysis unavailable ({exc}); using statistical forecast.",
            "best_time_to_buy": "neutral",
            "method":           "llm_fallback",
        }


def synthesize_recommendation(
    trend_direction: str,
    trend_pct_change: float,
    price_vs_median_pct: float,
    inventory_trend: str,
    predicted_price: float,
    # ── Statistical forecast (from run_forecast) ──────────────────────────────
    stat_forecast_30d: float = 0,
    stat_forecast_90d: float = 0,
    # ── LLM-enhanced forecast (from run_llm_price_analysis) ──────────────────
    llm_forecast_30d: float = 0,
    llm_forecast_90d: float = 0,
    llm_trend_direction: str = "",
    llm_best_time_to_buy: str = "",
    llm_key_insight: str = "",
) -> dict:
    """
    Rule-based BUY / WAIT / NEUTRAL logic with LLM-blended forecasts.

    Blending weights:
      30-day: 40% statistical + 60% LLM  (LLM captures near-term sentiment better)
      90-day: 30% statistical + 70% LLM  (LLM better at longer horizon reasoning)

    BUY    — forecast rising AND price below market median
    WAIT   — forecast falling by more than 2 %
    NEUTRAL — everything else  (LLM signals can nudge to BUY/WAIT)
    """
    # ── Blend forecasts ───────────────────────────────────────────────────────
    use_llm = llm_forecast_30d > 0 and stat_forecast_30d > 0

    if use_llm:
        blended_30d     = round(0.4 * stat_forecast_30d + 0.6 * llm_forecast_30d, 2)
        blended_90d     = round(0.3 * stat_forecast_90d + 0.7 * llm_forecast_90d, 2)
        forecast_method = "llm_blended"
        effective_trend = llm_trend_direction if llm_trend_direction else trend_direction
        effective_pct   = (
            round((blended_30d - float(predicted_price)) / float(predicted_price) * 100, 2)
            if predicted_price else float(trend_pct_change)
        )
    elif stat_forecast_30d > 0:
        blended_30d     = round(float(stat_forecast_30d), 2)
        blended_90d     = round(float(stat_forecast_90d), 2)
        forecast_method = "statistical"
        effective_trend = trend_direction
        effective_pct   = float(trend_pct_change)
    else:
        p               = float(predicted_price) if predicted_price else 18500.0
        t               = float(trend_pct_change)
        blended_30d     = round(p * (1 + t / 100), 2)
        blended_90d     = round(p * (1 + t / 100 * 3), 2)
        forecast_method = "estimated"
        effective_trend = trend_direction
        effective_pct   = t

    trend_pct  = float(effective_pct)
    pct_vs_med = float(price_vs_median_pct)

    # ── Core BUY / WAIT / NEUTRAL logic ──────────────────────────────────────
    if effective_trend == "rising" and pct_vs_med < 0:
        signal     = "BUY"
        confidence = "HIGH" if pct_vs_med < -5 else "MODERATE"
        # LLM can boost confidence
        if llm_best_time_to_buy == "now" and confidence == "MODERATE":
            confidence = "HIGH"
        rationale  = (
            f"Prices are {effective_trend} ({trend_pct:+.1f}% over 30 days) and this listing "
            f"is {abs(pct_vs_med):.1f}% below the market median — buy before prices climb further."
        )

    elif effective_trend == "falling" and trend_pct < -2:
        signal     = "WAIT"
        confidence = "HIGH" if trend_pct < -5 else "MODERATE"
        rationale  = (
            f"Prices are falling ({trend_pct:+.1f}% over 30 days) — waiting could "
            f"save you money in the near term."
        )

    else:
        signal     = "NEUTRAL"
        confidence = "LOW"
        # LLM can override a neutral signal when evidence is moderate
        if llm_best_time_to_buy == "now" and pct_vs_med < -3:
            signal, confidence = "BUY", "MODERATE"
        elif llm_best_time_to_buy in ("wait",) and trend_pct < 0:
            signal, confidence = "WAIT", "MODERATE"
        rationale  = (
            f"Market trend is flat ({trend_pct:+.1f}%) and this listing is "
            f"{pct_vs_med:+.1f}% vs the median — no strong signal either way."
        )

    if llm_key_insight:
        rationale += f" {llm_key_insight}"

    return {
        "recommendation": signal,
        "confidence":     confidence,
        "rationale":      rationale,
        "predicted_price": float(predicted_price),
        "forecast_30d":   blended_30d,
        "forecast_90d":   blended_90d,
        "forecast_method": forecast_method,
        "llm_key_insight": llm_key_insight,
    }


# ══════════════════════════════════════════════════════════════════════════════
# OpenAI tool schema definitions
# ══════════════════════════════════════════════════════════════════════════════

TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "get_price_history",
            "description": "Fetch monthly average price history for a specific make/model/year from MongoDB.",
            "parameters": {
                "type": "object",
                "properties": {
                    "make":  {"type": "string", "description": "Car manufacturer, e.g. 'toyota'"},
                    "model": {"type": "string", "description": "Car model, e.g. 'camry'"},
                    "year":  {"type": "integer", "description": "Model year, e.g. 2018"},
                },
                "required": ["make", "model", "year"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_forecast",
            "description": "Fetch price history from MongoDB and run a Prophet time-series forecast. Returns 30/90-day forecasts and trend direction.",
            "parameters": {
                "type": "object",
                "properties": {
                    "make":  {"type": "string",  "description": "Car manufacturer, e.g. 'toyota'"},
                    "model": {"type": "string",  "description": "Car model, e.g. 'camry'"},
                    "year":  {"type": "integer", "description": "Model year, e.g. 2018"},
                },
                "required": ["make", "model", "year"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_price_prediction",
            "description": "Run XGBoost model inference to predict fair market price and return top-3 SHAP factors.",
            "parameters": {
                "type": "object",
                "properties": {
                    "make":      {"type": "string"},
                    "model":     {"type": "string"},
                    "year":      {"type": "integer"},
                    "mileage":   {"type": "integer", "description": "Odometer reading in miles"},
                    "condition": {"type": "string",  "description": "e.g. good, excellent, fair"},
                    "region":    {"type": "string",  "description": "US state or region, e.g. california"},
                },
                "required": ["make", "model", "year", "mileage", "condition", "region"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_market_context",
            "description": "Fetch inventory count, trend (rising/falling), price-vs-median %, and regional price range.",
            "parameters": {
                "type": "object",
                "properties": {
                    "make":  {"type": "string"},
                    "model": {"type": "string"},
                    "year":  {"type": "integer"},
                },
                "required": ["make", "model", "year"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_llm_price_analysis",
            "description": (
                "AI-enhanced price analysis tool. Call this AFTER run_forecast, "
                "run_price_prediction, and get_market_context. "
                "Passes all collected data to a focused GPT model for nuanced "
                "30/90-day price forecasting that accounts for depreciation curves, "
                "seasonal patterns, and regional demand. Returns improved forecasts "
                "and a best-time-to-buy signal."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "make":               {"type": "string"},
                    "model":              {"type": "string"},
                    "year":               {"type": "integer"},
                    "mileage":            {"type": "integer",  "description": "Odometer reading in miles"},
                    "condition":          {"type": "string",   "description": "e.g. good, excellent, fair"},
                    "region":             {"type": "string",   "description": "US state or region"},
                    "current_price":      {"type": "number",   "description": "predicted_price from run_price_prediction"},
                    "stat_forecast_30d":  {"type": "number",   "description": "forecast_30d from run_forecast"},
                    "stat_forecast_90d":  {"type": "number",   "description": "forecast_90d from run_forecast"},
                    "trend_direction":    {"type": "string",   "description": "trend_direction from run_forecast"},
                    "trend_pct_30d":      {"type": "number",   "description": "trend_pct_change from run_forecast"},
                    "inventory_trend":    {"type": "string",   "description": "inventory_trend from get_market_context"},
                    "price_vs_median_pct":{"type": "number",   "description": "price_vs_median_pct from get_market_context"},
                },
                "required": [
                    "make", "model", "year", "mileage", "condition", "region",
                    "current_price", "stat_forecast_30d", "stat_forecast_90d",
                    "trend_direction", "trend_pct_30d", "inventory_trend", "price_vs_median_pct",
                ],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "synthesize_recommendation",
            "description": (
                "Rule-based BUY/WAIT/NEUTRAL signal with LLM-blended forecasts. "
                "Call this LAST, after all other tools including run_llm_price_analysis."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "trend_direction":    {"type": "string",  "description": "'rising' or 'falling' from run_forecast"},
                    "trend_pct_change":   {"type": "number",  "description": "trend_pct_change from run_forecast"},
                    "price_vs_median_pct":{"type": "number",  "description": "price_vs_median_pct from get_market_context"},
                    "inventory_trend":    {"type": "string",  "description": "'rising' or 'falling' from get_market_context"},
                    "predicted_price":    {"type": "number",  "description": "predicted_price from run_price_prediction"},
                    "stat_forecast_30d":  {"type": "number",  "description": "forecast_30d from run_forecast"},
                    "stat_forecast_90d":  {"type": "number",  "description": "forecast_90d from run_forecast"},
                    "llm_forecast_30d":   {"type": "number",  "description": "forecast_30d from run_llm_price_analysis"},
                    "llm_forecast_90d":   {"type": "number",  "description": "forecast_90d from run_llm_price_analysis"},
                    "llm_trend_direction":{"type": "string",  "description": "trend_direction from run_llm_price_analysis"},
                    "llm_best_time_to_buy":{"type": "string", "description": "best_time_to_buy from run_llm_price_analysis"},
                    "llm_key_insight":    {"type": "string",  "description": "key_insight from run_llm_price_analysis"},
                },
                "required": [
                    "trend_direction", "trend_pct_change",
                    "price_vs_median_pct", "inventory_trend", "predicted_price",
                ],
            },
        },
    },
]

# ══════════════════════════════════════════════════════════════════════════════
# Tool dispatcher
# ══════════════════════════════════════════════════════════════════════════════

_TOOL_FN_MAP = {
    "get_price_history":        get_price_history,
    "run_forecast":             run_forecast,
    "run_price_prediction":     run_price_prediction,
    "get_market_context":       get_market_context,
    "run_llm_price_analysis":   run_llm_price_analysis,
    "synthesize_recommendation": synthesize_recommendation,
}


def _dispatch(tool_name: str, args: dict) -> Any:
    fn = _TOOL_FN_MAP.get(tool_name)
    if fn is None:
        return {"error": f"Unknown tool: {tool_name}"}
    return fn(**args)


# ══════════════════════════════════════════════════════════════════════════════
# Agent loop
# ══════════════════════════════════════════════════════════════════════════════

def run_agent(user_query: str, max_tool_rounds: int = 12) -> dict:
    """
    Run the full tool-calling agent loop for a user car query.

    Parameters
    ----------
    user_query     : Natural-language query, e.g. "Should I buy a 2018 Toyota Camry
                     with 45k miles in good condition in California?"
    max_tool_rounds: Safety cap on tool-call iterations.

    Returns
    -------
    {
      "recommendation": "BUY" | "WAIT" | "NEUTRAL",
      "confidence":     "HIGH" | "MODERATE" | "LOW",
      "explanation":    str,   # 3-sentence plain-English from GPT-4o-mini
      "predicted_price": float,
      "forecast_30d":   float, # blended AI + statistical 30-day forecast
      "forecast_90d":   float, # blended AI + statistical 90-day forecast
      "forecast_method": str,  # "llm_blended" | "statistical" | "estimated"
      "llm_key_insight": str,  # one-line insight from LLM analysis
      "tool_outputs":   dict,  # raw output from every tool called
    }
    """
    messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_query},
    ]

    tool_outputs: dict = {}
    recommendation_result: dict = {}

    for _ in range(max_tool_rounds):
        response = _oai.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )
        msg = response.choices[0].message

        # ── No more tool calls → final answer ────────────────────────────────
        if not msg.tool_calls:
            explanation = msg.content or ""
            return {
                "recommendation":  recommendation_result.get("recommendation", "NEUTRAL"),
                "confidence":      recommendation_result.get("confidence", "LOW"),
                "explanation":     explanation,
                "predicted_price": recommendation_result.get("predicted_price", 0.0),
                "forecast_30d":    recommendation_result.get("forecast_30d", 0.0),
                "forecast_90d":    recommendation_result.get("forecast_90d", 0.0),
                "forecast_method": recommendation_result.get("forecast_method", "statistical"),
                "llm_key_insight": recommendation_result.get("llm_key_insight", ""),
                "tool_outputs":    tool_outputs,
            }

        # ── Execute each requested tool call ─────────────────────────────────
        messages.append(msg)   # append assistant's tool-call message

        for tc in msg.tool_calls:
            args   = json.loads(tc.function.arguments)
            result = _dispatch(tc.function.name, args)

            # Capture synthesize_recommendation output for top-level return
            if tc.function.name == "synthesize_recommendation":
                recommendation_result = result

            tool_outputs[tc.function.name] = result

            messages.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      json.dumps(result, default=str),
            })

    return {
        "recommendation": recommendation_result.get("recommendation", "NEUTRAL"),
        "confidence":     recommendation_result.get("confidence", "LOW"),
        "explanation":    "Max tool rounds reached without final LLM response.",
        "predicted_price": recommendation_result.get("predicted_price", 0.0),
        "forecast_30d":   recommendation_result.get("forecast_30d", 0.0),
        "forecast_90d":   recommendation_result.get("forecast_90d", 0.0),
        "forecast_method": recommendation_result.get("forecast_method", "statistical"),
        "llm_key_insight": recommendation_result.get("llm_key_insight", ""),
        "tool_outputs":   tool_outputs,
    }


# ══════════════════════════════════════════════════════════════════════════════
# CLI entry point
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Windows UTF-8 fix

    query = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "Should I buy a 2018 Toyota Camry with 45,000 miles in good condition in California?"
    )
    sep = "-" * 60
    print(f"\nQuery: {query}\n{sep}")
    result = run_agent(query)

    print(f"Recommendation : {result['recommendation']}  ({result['confidence']} confidence)")
    print(f"Predicted price: ${result['predicted_price']:,.0f}")
    print(f"30-day forecast: ${result['forecast_30d']:,.0f}  ({result['forecast_method']})")
    print(f"90-day forecast: ${result['forecast_90d']:,.0f}")
    if result["llm_key_insight"]:
        print(f"AI insight: {result['llm_key_insight']}")
    print(f"\nExplanation:\n{result['explanation']}")
    print(f"\n{sep}\nTool outputs:")
    print(json.dumps(result["tool_outputs"], indent=2, default=str))
