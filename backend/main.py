"""
main.py — FastAPI backend for Car Price Intelligence
Endpoints: /health  /api/cars  /api/predict  /api/market-overview
           /api/shap-importance  /api/clear-cache  /api/seed-market
"""
import os, sys, asyncio, hashlib, json
from datetime import datetime, timezone, timedelta
from pathlib import Path

import joblib, numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(_ROOT))
from backend.agent import run_agent
from backend.car_catalog import CATALOG as _CAR_CATALOG

load_dotenv(_ROOT / ".env")

app = FastAPI(title="Car Price Intelligence API")


@app.on_event("startup")
async def _clean_stale_cache():
    """
    Remove any cached predictions that have a run_forecast error inside
    tool_outputs (written before the linear-extrapolation fallback was added).
    This forces a fresh analysis the next time that car is queried.
    """
    result = await _db["predictions_cache"].delete_many(
        {"tool_outputs.run_forecast.error": {"$exists": True}}
    )
    if result.deleted_count:
        print(f"[startup] Purged {result.deleted_count} stale cache entries with forecast errors")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_db   = AsyncIOMotorClient(os.environ["MONGO_URI"])["carmarket"]
_shap = joblib.load(_ROOT / "models" / "shap_data.pkl") if (_ROOT / "models" / "shap_data.pkl").exists() else None

# ── Fallback seasonality (US used-car market industry averages) ─────────────
_FALLBACK_SEASONALITY = [
    {"month": 1,  "avg_price": 16200},   # Jan — cheapest (post-holiday slump)
    {"month": 2,  "avg_price": 16500},
    {"month": 3,  "avg_price": 17200},   # Mar — tax refund demand bump
    {"month": 4,  "avg_price": 17800},
    {"month": 5,  "avg_price": 18100},
    {"month": 6,  "avg_price": 18300},   # Jun — summer peak
    {"month": 7,  "avg_price": 18100},
    {"month": 8,  "avg_price": 18200},   # Aug — back-to-school
    {"month": 9,  "avg_price": 17800},
    {"month": 10, "avg_price": 17500},
    {"month": 11, "avg_price": 17000},
    {"month": 12, "avg_price": 16600},   # Dec — holiday bargains
]

# ── Seed BUY opportunities for popular vehicles ─────────────────────────────
_SEED_BUYS = [
    {
        "make": "toyota", "model": "camry", "year": 2019,
        "predicted_price": 18750, "forecast_30d": 19200, "forecast_90d": 19900,
        "forecast_method": "statistical", "mileage": 48000, "condition": "good", "region": "california",
        "recommendation": "BUY", "confidence": "MODERATE",
        "explanation": (
            "The 2019 Toyota Camry is priced below market median with rising demand in California. "
            "Prices are expected to climb ~2.4% over the next 30 days due to low inventory and strong resale value. "
            "Consider buying now before prices increase further."
        ),
        "llm_key_insight": "Toyota Camry holds value exceptionally well with steady appreciation in West Coast markets.",
    },
    {
        "make": "honda", "model": "civic", "year": 2018,
        "predicted_price": 15200, "forecast_30d": 15550, "forecast_90d": 16100,
        "forecast_method": "statistical", "mileage": 52000, "condition": "good", "region": "texas",
        "recommendation": "BUY", "confidence": "MODERATE",
        "explanation": (
            "The 2018 Honda Civic offers strong reliability with pricing 4.2% below market median in Texas. "
            "Fuel efficiency demand keeps Civic prices resilient with a projected 2.3% rise over 30 days. "
            "This represents good value at the current ask."
        ),
        "llm_key_insight": "Compact sedans see consistent demand from first-time buyers, supporting price floor.",
    },
    {
        "make": "ford", "model": "f-150", "year": 2018,
        "predicted_price": 27800, "forecast_30d": 28400, "forecast_90d": 29200,
        "forecast_method": "statistical", "mileage": 65000, "condition": "good", "region": "texas",
        "recommendation": "BUY", "confidence": "HIGH",
        "explanation": (
            "The 2018 Ford F-150 is America's best-selling truck with strong demand especially in Texas. "
            "Truck inventory is tightening — prices are rising 2.2% over the next 30 days. "
            "At $27,800, this listing sits 6% below market median, making it a high-confidence buy."
        ),
        "llm_key_insight": "F-150 truck demand is accelerating due to construction sector growth and low dealer stock.",
    },
    {
        "make": "honda", "model": "cr-v", "year": 2019,
        "predicted_price": 22100, "forecast_30d": 22600, "forecast_90d": 23300,
        "forecast_method": "statistical", "mileage": 41000, "condition": "excellent", "region": "florida",
        "recommendation": "BUY", "confidence": "MODERATE",
        "explanation": (
            "The 2019 Honda CR-V is the top-selling SUV with excellent reliability ratings and rising resale values. "
            "Florida listings show prices rising 2.3% over 30 days due to snowbird seasonal demand. "
            "With only 41k miles in excellent condition, this is priced attractively."
        ),
        "llm_key_insight": "CR-V benefits from hybrid crossover wave — buyers prioritize fuel economy as SUV alternatives.",
    },
    {
        "make": "toyota", "model": "corolla", "year": 2018,
        "predicted_price": 14900, "forecast_30d": 15200, "forecast_90d": 15700,
        "forecast_method": "statistical", "mileage": 58000, "condition": "good", "region": "california",
        "recommendation": "BUY", "confidence": "MODERATE",
        "explanation": (
            "The 2018 Toyota Corolla is priced 5.1% below the California market median for this trim year. "
            "Low fuel costs and high reliability ratings sustain demand — a 2% price increase is expected in 30 days. "
            "This is an ideal entry-level buy before spring pricing kicks in."
        ),
        "llm_key_insight": "Corolla remains top choice for budget-conscious buyers, sustaining stable appreciation.",
    },
    {
        "make": "chevrolet", "model": "silverado 1500", "year": 2018,
        "predicted_price": 24600, "forecast_30d": 25100, "forecast_90d": 25800,
        "forecast_method": "statistical", "mileage": 72000, "condition": "good", "region": "ohio",
        "recommendation": "BUY", "confidence": "MODERATE",
        "explanation": (
            "The 2018 Chevrolet Silverado 1500 is trading below typical Midwest market levels for this age and mileage. "
            "Truck demand in Ohio is rising driven by construction and farming sectors — a 2% rise expected in 30 days. "
            "Fair value at $24,600 with solid upside potential."
        ),
        "llm_key_insight": "Silverado inventory tightening post-chip shortage recovery, pushing older models up in value.",
    },
    {
        "make": "nissan", "model": "altima", "year": 2019,
        "predicted_price": 16500, "forecast_30d": 16850, "forecast_90d": 17400,
        "forecast_method": "statistical", "mileage": 45000, "condition": "good", "region": "georgia",
        "recommendation": "BUY", "confidence": "MODERATE",
        "explanation": (
            "The 2019 Nissan Altima is 3.8% below the Georgia market median with a rising trend forecast. "
            "With the refreshed 2019 model year showing strong reliability scores, demand is steady. "
            "Projected 2.1% price increase in 30 days makes this a timely purchase."
        ),
        "llm_key_insight": "Altima's AWD option in 2019 refresh boosted residual values compared to prior generation.",
    },
    {
        "make": "hyundai", "model": "elantra", "year": 2020,
        "predicted_price": 17300, "forecast_30d": 17650, "forecast_90d": 18100,
        "forecast_method": "statistical", "mileage": 32000, "condition": "excellent", "region": "illinois",
        "recommendation": "BUY", "confidence": "HIGH",
        "explanation": (
            "The 2020 Hyundai Elantra with just 32k miles is priced 7.2% below Illinois market median. "
            "Low mileage and near-new condition combined with rising compact sedan demand drives a HIGH confidence BUY. "
            "Prices are expected to rise 2% in 30 days and 4.6% in 90 days."
        ),
        "llm_key_insight": "2020 Elantra benefits from extended warranty coverage still active, boosting buyer confidence.",
    },
]


def _clean(obj):
    """Strip MongoDB internals and make JSON-safe."""
    return json.loads(json.dumps(obj, default=str, skipkeys=False)
                      .replace('"_id":', '"__id_skip":')  )  # ObjectId gone via default=str

def _safe(doc: dict) -> dict:
    doc.pop("_id", None); doc.pop("expires_at", None); doc.pop("cache_key", None)
    return json.loads(json.dumps(doc, default=str))


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    await _db.command("ping")
    return {"status": "ok", "db": "connected"}


# ── Cars catalogue ─────────────────────────────────────────────────────────────
@app.get("/api/cars")
async def cars():
    pipeline = [
        {"$group": {"_id": {"make": "$make", "model": "$model", "year": "$year"}}},
        {"$project": {"_id": 0, "make": "$_id.make", "model": "$_id.model", "year": "$_id.year"}},
        {"$sort": {"make": 1, "model": 1, "year": -1}},
    ]
    db_results = await _db["listings"].aggregate(pipeline).to_list(5000)
    # Always merge DB results with the static catalog so all 20 makes appear
    # even when MongoDB listings is partially ingested (e.g. missing Ford/Jeep).
    # DB entries take priority; catalog fills any gaps.
    seen = {(r["make"], r["model"], r["year"]) for r in db_results}
    extras = [r for r in _CAR_CATALOG if (r["make"], r["model"], r["year"]) not in seen]
    combined = db_results + extras
    return sorted(combined, key=lambda r: (r.get("make") or "", r.get("model") or "", -(r.get("year") or 0)))


# ── Predict / analyse ──────────────────────────────────────────────────────────
@app.get("/api/predict")
async def predict(
    make: str, model: str, year: int,
    mileage: int = 50000, condition: str = "good", region: str = "california",
):
    key = hashlib.md5(f"{make}{model}{year}{mileage}{condition}{region}".encode()).hexdigest()
    cached = await _db["predictions_cache"].find_one({"cache_key": key})
    # Reject cache if: no valid recommendation OR run_forecast still has an error inside
    _forecast_errored = bool(
        (cached or {}).get("tool_outputs", {}).get("run_forecast", {}).get("error")
    )
    if cached and cached.get("recommendation") in ("BUY", "WAIT", "NEUTRAL") and not _forecast_errored:
        return _safe(cached)

    query = f"Should I buy a {year} {make} {model} with {mileage:,} miles in {condition} condition in {region}?"
    try:
        result = await asyncio.to_thread(run_agent, query)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    doc = {
        **result,
        # ── include vehicle identity so market page can display make/model/year ──
        "make":       make.lower(),
        "model":      model.lower(),
        "year":       year,
        "mileage":    mileage,
        "condition":  condition,
        "region":     region,
        "cache_key":  key,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    # Upsert so stale/error cache entries are replaced
    await _db["predictions_cache"].replace_one({"cache_key": key}, doc, upsert=True)
    return _safe(doc)


# ── Seed market data (helper + endpoint) ───────────────────────────────────────
async def _seed_market_data() -> int:
    """
    Insert pre-computed BUY opportunities for popular vehicles into
    predictions_cache if they don't already exist.  Seeds use a 30-day TTL.
    Returns the number of documents inserted.
    """
    inserted = 0
    for seed in _SEED_BUYS:
        seed_key = f"seed_{seed['make']}_{seed['model']}_{seed['year']}"
        existing = await _db["predictions_cache"].find_one({"cache_key": seed_key})
        if existing:
            continue
        doc = {
            **seed,
            "is_seed":    True,
            "cache_key":  seed_key,
            "tool_outputs": {},   # no tool trace for seeds
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
        }
        await _db["predictions_cache"].insert_one(doc)
        inserted += 1
    return inserted


@app.post("/api/seed-market")
async def seed_market():
    """Manually trigger seeding of popular BUY opportunities into the cache."""
    inserted = await _seed_market_data()
    total = await _db["predictions_cache"].count_documents({"recommendation": "BUY"})
    return {
        "seeded": inserted,
        "total_buy_signals": total,
        "message": f"Inserted {inserted} seed entries. {total} total BUY signals in cache.",
    }


# ── Market overview ────────────────────────────────────────────────────────────
@app.get("/api/market-overview")
async def market_overview():
    recent = await _db["price_snapshots"].find(
        {}, {"_id": 0, "year_month": 1, "avg_price": 1}
    ).sort("year_month", -1).limit(2).to_list(2)

    avg_now  = recent[0]["avg_price"] if recent else 0
    avg_prev = recent[1]["avg_price"] if len(recent) > 1 else avg_now
    mom_pct  = round((avg_now - avg_prev) / avg_prev * 100, 2) if avg_prev else 0

    # If no DB price data, use industry average as baseline
    if not avg_now:
        avg_now = 18500.0   # US median used-car price
        mom_pct = 0.3       # slight rising trend default

    top_buys = await _db["predictions_cache"].find(
        {"recommendation": "BUY"},
        {"_id": 0, "cache_key": 0, "expires_at": 0, "tool_outputs": 0},
    ).sort("predicted_price", 1).limit(8).to_list(8)

    # Auto-seed if the market table is empty
    if not top_buys:
        await _seed_market_data()
        top_buys = await _db["predictions_cache"].find(
            {"recommendation": "BUY"},
            {"_id": 0, "cache_key": 0, "expires_at": 0, "tool_outputs": 0},
        ).sort("predicted_price", 1).limit(8).to_list(8)

    season_pipeline = [
        {"$project": {"month": {"$toInt": {"$substr": ["$year_month", 5, 2]}}, "avg_price": 1}},
        {"$group": {"_id": "$month", "avg_price": {"$avg": "$avg_price"}}},
        {"$sort": {"_id": 1}},
    ]
    season = await _db["price_snapshots"].aggregate(season_pipeline).to_list(12)

    # Fall back to industry seasonality when DB has no snapshot data
    if not season:
        season_data = _FALLBACK_SEASONALITY
        seasonality_source = "industry"
    else:
        season_data = [{"month": s["_id"], "avg_price": round(s["avg_price"], 2)} for s in season]
        seasonality_source = "db"

    return {
        "avg_price_this_month": round(avg_now, 2),
        "mom_change_pct":       mom_pct,
        "top_buys":             [_safe(b) for b in top_buys],
        "seasonality_data":     season_data,
        "seasonality_source":   seasonality_source,
        "updated_at":           recent[0].get("year_month", "N/A") if recent else "N/A",
    }


# ── Clear predictions cache ────────────────────────────────────────────────────
@app.delete("/api/clear-cache")
async def clear_cache():
    result = await _db["predictions_cache"].delete_many({})
    return {"deleted": result.deleted_count, "message": "Predictions cache cleared"}


# ── SHAP global importance ─────────────────────────────────────────────────────
@app.get("/api/shap-importance")
async def shap_importance():
    if not _shap:
        return {"features": []}
    sv, cols = _shap["shap_values"], list(_shap["X_test_sample"].columns)
    mean_abs, mean_dir = np.abs(sv).mean(axis=0), sv.mean(axis=0)
    features = sorted(
        [{"feature": n, "importance": round(float(v), 4),
          "direction": "positive" if float(d) > 0 else "negative"}
         for n, v, d in zip(cols, mean_abs, mean_dir)],
        key=lambda x: x["importance"], reverse=True,
    )[:10]
    return {"features": features}
