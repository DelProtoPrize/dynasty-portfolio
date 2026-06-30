# Dynasty Roster Portfolio & Asset Valuation

A full-stack analytics product that treats dynasty fantasy football rosters like
financial asset portfolios — valuation, concentration, arbitrage, risk, and
trajectory — built on a reproducible data pipeline.

## Architecture

```
Sleeper API ─┐
FantasyCalc ─┼─►  ETL v2 (Python)  ─►  Warehouse  ─►  SvelteKit (API + SSR Dashboard)
DynastyProcess ┘   python -m etl_v2.run   SQLite / Postgres   dashboard/
```

Key principle: **the browser only ever talks to our SvelteKit server.** External
sources (all public, read-only, no keys) are touched solely by the ETL. The
dashboard serves pre-computed analytics from the warehouse — it never calls
Sleeper live.

## Layout

```
dynasty-portfolio/
├─ etl_v2/               Orchestrated ETL pipeline (single CLI entrypoint)
│  ├─ run.py             python -m etl_v2.run --output db|csv
│  ├─ config.py          all URLs/paths/constants from .env
│  ├─ seed.py            seed DB from CSV folder (--input csv)
│  ├─ steps/             adapter modules (one per pipeline stage)
│  ├─ output/            db (upsert) and csv writers
│  └─ tests/             unit tests (pytest, 97% coverage)
├─ etl/                  Original Python scripts (called by etl_v2/steps/)
│  ├─ etl_pipeline.py    extract + load star schema
│  ├─ schema.sql         canonical star schema + views
│  └─ requirements.txt
├─ dashboard/            SvelteKit app (Svelte 5, Tailwind v4, shadcn-svelte)
│  └─ src/
│     ├─ lib/server/db.ts    data layer (SQLite local, Postgres in prod)
│     ├─ routes/api/         REST endpoints
│     └─ lib/components/     Plotly charts, KPI cards, tables
├─ .env.example          documented template of all env vars
└─ docs/ROADMAP.md       capability roadmap
```

## Local setup

```bash
# 1) Configure
cp .env.example .env    # set SLEEPER_USERNAME at minimum

# 2) Install + run (cross-platform)
npm run setup           # creates .venv, installs Python + Node deps
npm run pipeline        # full ETL → DB
npm run dev             # dashboard at http://localhost:3000

# Or with Make (Mac):
make all                # install + pipeline + dev server

# ETL CLI options:
python -m etl_v2.run --output db                    # full pipeline → DB
python -m etl_v2.run --output csv                   # full pipeline → CSV files
python -m etl_v2.run --input csv                    # seed DB from CSV folder
python -m etl_v2.run --input csv --from ./exports   # seed from custom path
python -m etl_v2.run --skip-projections             # skip a step
python -m etl_v2.run --only extract                 # run one step
python -m etl_v2.run --dry-run                      # extract + transform, no writes
```

Local uses SQLite (zero config). To deploy, set `DATABASE_URL` to a Postgres
connection string; the same ETL and dashboard code work without changes.

## Docker

```bash
# Run everything (Postgres + ETL + dashboard):
SLEEPER_USERNAME=your_handle docker compose up --build

# Dashboard available at http://localhost:3000
```

This starts:
- **Postgres 16** — warehouse database
- **ETL** — runs the full pipeline, loads Postgres, then exits
- **Dashboard** — SvelteKit production build on port 3000

To re-run the ETL after the initial load:
```bash
docker compose run etl
```

## Data sources (public, unauthenticated)
- **Sleeper** — leagues, rosters, players, drafts, matchups, transactions
- **DynastyProcess** — FantasyPros ECR values (primary) + the ID crosswalk
- **FantasyCalc** — market values (secondary; powers the arbitrage signal)
