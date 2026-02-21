# MongoDB Atlas Setup — What You Need To Do

Before running `scripts/mongo_ingest.py`, complete every step below in order.

---

## Step 1 — Create a MongoDB Atlas account & cluster

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign up / log in
2. Click **"Create"** → choose **M0 Free Tier** (enough for dev)
3. Pick a cloud provider + region (any, prefer close to you)
4. Name the cluster — e.g. `carmarket-cluster`
5. Click **"Create Cluster"** and wait ~2 min for provisioning

---

## Step 2 — Create a database user

1. Left sidebar → **Database Access** → **"Add New Database User"**
2. Auth method: **Password**
3. Username: `carmarket_user` (or anything you like)
4. Password: generate a strong one — **save it, you'll need it in Step 4**
5. Built-in role: **Atlas admin** (for dev) or **Read and write to any database**
6. Click **"Add User"**

---

## Step 3 — Whitelist your IP

1. Left sidebar → **Network Access** → **"Add IP Address"**
2. Click **"Allow Access From Anywhere"** (`0.0.0.0/0`) for dev
   *(or add your specific IP for tighter security)*
3. Click **"Confirm"**

---

## Step 4 — Get your connection string

1. Left sidebar → **Database** → click **"Connect"** on your cluster
2. Choose **"Drivers"** → Driver: **Python**, Version: **3.12 or later**
3. Copy the connection string, it looks like:
   ```
   mongodb+srv://<username>:<password>@carmarket-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<username>` and `<password>` with the credentials from Step 2

---

## Step 5 — Create the `.env` file

In the project root (`car-price-intelligence/`), create a file named **`.env`**:

```env
MONGO_URI=mongodb+srv://carmarket_user:YOUR_PASSWORD@carmarket-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

> `.env` is already in `.gitignore` — it will never be committed.

---

## Step 6 — Install dependencies

```bash
pip install pymongo[srv] pandas python-dotenv
```

Or if you have a `requirements.txt`:

```bash
pip install -r requirements.txt
```

---

## Step 7 — Make sure `cleaned_cars.csv` exists

The script reads from `Data/cleaned_cars.csv`.
If you haven't run the Colab cleaning notebook yet, do that first and place the output at:

```
car-price-intelligence/
└── Data/
    └── cleaned_cars.csv   ← must exist before running ingest
```

---

## Step 8 — Run the script

From the project root:

```bash
python scripts/mongo_ingest.py
```

Expected output:

```
Loaded 250,000 rows from cleaned_cars.csv
listings        — indexed and inserted 250,000 docs
price_snapshots — inserted 12,430 docs
predictions_cache — TTL index created (expireAfterSeconds=3600)

=== Collection counts ===
  listings               250,000
  price_snapshots         12,430
  predictions_cache            0
```

---

## Step 9 — Verify in Atlas UI

1. Atlas → **Database** → **Browse Collections**
2. You should see database **`carmarket`** with:
   - `listings` — one document per car listing
   - `price_snapshots` — aggregated avg/median price per (make, model, year, year_month)
   - `predictions_cache` — empty for now, will auto-populate when the API runs

---

## Collections & Indexes Reference

| Collection | Index fields | Type | Purpose |
|---|---|---|---|
| `listings` | `(make, model, year)` | Compound | Fast lookup by car identity |
| `price_snapshots` | `(make, model, year, year_month)` | Compound | Time-series price queries |
| `predictions_cache` | `expires_at` | TTL (3600 s) | Auto-expire stale predictions |

---

## Troubleshooting

| Error | Fix |
|---|---|
| `KeyError: 'MONGO_URI'` | `.env` file missing or not in project root |
| `ServerSelectionTimeoutError` | IP not whitelisted (Step 3) or wrong connection string |
| `Authentication failed` | Wrong username/password in connection string |
| `$median not recognised` | Atlas cluster is below MongoDB 7.0 — upgrade or switch to Python-side median (see note below) |

> **Note on `$median`:** The aggregation pipeline uses `$median` which requires **MongoDB 7.0+** on Atlas. If your free-tier cluster is on 6.x, the script will raise an error. In that case, open `mongo_ingest.py` and replace the `pipeline` block with the Python-side median approach (calculate with pandas before inserting).
