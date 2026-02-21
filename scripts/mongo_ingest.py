"""
mongo_ingest.py
Ingest cleaned_cars.csv into MongoDB Atlas — carmarket database.
Collections: listings, price_snapshots, predictions_cache (TTL)
"""

import os
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING

# ── Config ────────────────────────────────────────────────────────────────────
load_dotenv()

MONGO_URI  = os.environ["MONGO_URI"]          # raises immediately if missing
DB_NAME    = "carmarket"
CSV_PATH   = Path(__file__).parent.parent / "Data" / "cleaned_cars.csv"
BATCH_SIZE = 5_000                            # rows per insert_many call

# ── Helpers ───────────────────────────────────────────────────────────────────
def load_csv(path: Path) -> list[dict]:
    df = pd.read_csv(path, low_memory=False)
    df.columns = df.columns.str.strip().str.lower()
    # Rename 'manufacturer' -> 'make' for cleaner document keys
    df = df.rename(columns={"manufacturer": "make"})
    # Replace NaN with None so pymongo stores null, not 'nan'
    df = df.where(pd.notna(df), None)
    now = datetime.now(timezone.utc)
    df["ingested_at"] = now
    return df.to_dict("records")


def chunked(lst: list, size: int):
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    client = MongoClient(MONGO_URI)
    db     = client[DB_NAME]

    # ── 1. listings ───────────────────────────────────────────────────────────
    listings_col = db["listings"]
    listings_col.drop()                       # idempotent re-run: fresh load

    docs = load_csv(CSV_PATH)
    print(f"Loaded {len(docs):,} rows from {CSV_PATH.name}")

    for batch in chunked(docs, BATCH_SIZE):
        listings_col.insert_many(batch, ordered=False)

    listings_col.create_index(
        [("make", ASCENDING), ("model", ASCENDING), ("year", ASCENDING)],
        name="make_model_year",
    )
    print(f"listings — indexed and inserted {listings_col.count_documents({}):,} docs")

    # ── 2. price_snapshots ────────────────────────────────────────────────────
    snapshots_col = db["price_snapshots"]
    snapshots_col.drop()

    pipeline = [
        {"$match": {"price": {"$exists": True}, "year_month": {"$exists": True}}},
        {"$group": {
            "_id": {
                "make":       "$make",
                "model":      "$model",
                "year":       "$year",
                "year_month": "$year_month",
            },
            "avg_price":     {"$avg": "$price"},
            "median_price":  {"$median": {"input": "$price", "method": "approximate"}},
            "listing_count": {"$sum": 1},
        }},
        {"$project": {
            "_id":           0,
            "make":          "$_id.make",
            "model":         "$_id.model",
            "year":          "$_id.year",
            "year_month":    "$_id.year_month",
            "avg_price":     {"$round": ["$avg_price", 2]},
            "median_price":  {"$round": ["$median_price", 2]},
            "listing_count": 1,
            "created_at":    {"$literal": datetime.now(timezone.utc)},
        }},
    ]

    snapshots = list(db["listings"].aggregate(pipeline, allowDiskUse=True))
    if snapshots:
        snapshots_col.insert_many(snapshots, ordered=False)

    snapshots_col.create_index(
        [("make", ASCENDING), ("model", ASCENDING),
         ("year", ASCENDING), ("year_month", ASCENDING)],
        name="make_model_year_month",
    )
    print(f"price_snapshots — inserted {snapshots_col.count_documents({}):,} docs")

    # ── 3. predictions_cache — TTL index (expires after 3600 s) ───────────────
    cache_col = db["predictions_cache"]
    cache_col.create_index(
        [("expires_at", ASCENDING)],
        expireAfterSeconds=3600,
        name="ttl_expires_at",
    )
    print(f"predictions_cache — TTL index created (expireAfterSeconds=3600)")

    # ── 4. Summary ────────────────────────────────────────────────────────────
    print("\n=== Collection counts ===")
    for name in ["listings", "price_snapshots", "predictions_cache"]:
        print(f"  {name:<22} {db[name].count_documents({}):>8,}")

    client.close()


if __name__ == "__main__":
    main()
