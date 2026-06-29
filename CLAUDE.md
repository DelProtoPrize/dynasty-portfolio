# Dynasty Portfolio

Dynasty fantasy football roster analytics platform — treats rosters like financial asset portfolios (valuation, concentration, arbitrage, risk, trajectory).

## Architecture

```
Sleeper API / FantasyCalc / DynastyProcess
        ↓
  ETL (Python) → SQLite warehouse → Express API → Static dashboard (HTML/JS + Plotly)
```

The browser only talks to our API. External sources are consumed exclusively by the ETL.

## Project Layout

- `etl/` — Python pipeline (pandas, SQLAlchemy, SQLite). `etl_pipeline.py` is the main entry point.
- `etl/schema.sql` — Star schema (fact_roster_historical_value, fact_transactions, dims, views).
- `server/` — Node/Express API (ESM). `src/index.js` entry, `src/routes/analytics.js` for endpoints.
- `server/src/db.js` — Data layer (better-sqlite3 locally, pg in prod via `DATABASE_URL`).
- `web/` — Static HTML dashboard served by Express. `web/src/app.js` for client logic.
- `docs/ROADMAP.md` — Capability roadmap with scope triage.

## Running Locally

```bash
# ETL
cd etl && pip install -r requirements.txt && python etl_pipeline.py

# Server (serves API + static web/)
cd server && npm install && npm start  # http://localhost:3000
# Dev mode with watch: npm run dev
```

## Key Technical Decisions

- SQLite locally (zero config), Postgres in prod — same ETL/API code for both.
- No TE-premium multiplier applied at the data layer. TEP is computed downstream of projection models.
- Market values are snapshot facts (appended each ETL run). History accrues forward.
- Heavy math (DCF, projections, risk models) lives in Python; Node serves pre-computed results.
- Star schema: dims loaded before facts; FK enforcement optional via pragma.

## Conventions

- Server uses ES modules (`"type": "module"` in package.json).
- ETL writes to `etl/data/dynasty.db` (gitignored).
- Environment: `.env` at project root (gitignored). Key var: `SLEEPER_USERNAME`.
- Data sources are all public/unauthenticated (Sleeper, DynastyProcess, FantasyCalc).
