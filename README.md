# Dynasty Roster Portfolio & Asset Valuation

A full-stack analytics product that treats dynasty fantasy football rosters like
financial asset portfolios — valuation, concentration, arbitrage, risk, and
trajectory — built on a reproducible data pipeline.

## Architecture

```
Sleeper API ─┐
FantasyCalc ─┼─►  ETL (Python)  ─►  Warehouse  ─►  API (Node/Express)  ─►  Dashboard (HTML/JS)
DynastyProcess ┘   etl_pipeline.py    SQLite / Postgres   server/             web/
                   (scheduled job)
```

Key principle: **the browser only ever talks to our own API.** External sources
(all public, read-only, no keys) are touched solely by the ETL, which runs as a
separate scheduled job. The website serves pre-computed analytics from the
warehouse — it never calls Sleeper live. Our value-add lives in the warehouse and
the analytics layer, not in the raw feeds.

## Layout

```
dynasty-portfolio/
├─ etl/                  Python pipeline (extract → normalize → load → CSV extracts)
│  ├─ etl_pipeline.py
│  ├─ schema.sql         canonical star schema + views
│  └─ requirements.txt
├─ server/               Node + Express API
│  └─ src/
│     ├─ index.js        app entry (serves API + static web/)
│     ├─ db.js           one data layer: SQLite local, Postgres in prod
│     └─ routes/analytics.js   window-function analytics (percentile, HHI, arbitrage)
├─ web/                  static dashboard (Plotly)
│  ├─ index.html
│  └─ src/app.js
└─ docs/ROADMAP.md       capability roadmap + honest scope triage
```

## Local setup

```bash
# 1) Data layer — build the warehouse (one time / scheduled)
cd etl
pip install -r requirements.txt
cp ../.env.example ../.env          # set SLEEPER_USERNAME
python etl_pipeline.py              # writes etl/data/dynasty.db

# 2) API + dashboard
cd ../server
npm install
npm start                           # http://localhost:3000
```

Local uses SQLite (zero config). To deploy, set `DATABASE_URL` to a free Postgres
(Neon/Supabase); the **same** ETL loads it and the API reads it — no code change.

## Data sources (public, unauthenticated)
- **Sleeper** — leagues, rosters, players, drafts, matchups, transactions
- **DynastyProcess** — FantasyPros ECR values (primary) + the ID crosswalk
- **FantasyCalc** — market values (secondary; powers the arbitrage signal)
