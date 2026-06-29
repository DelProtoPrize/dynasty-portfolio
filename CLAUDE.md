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
- `dashboard/` — SvelteKit app (TypeScript, Svelte 5). Serves API + SSR dashboard in one process.
- `dashboard/src/lib/server/db.ts` — Data layer (better-sqlite3 locally, pg in prod via `DATABASE_URL`).
- `dashboard/src/routes/api/` — REST endpoints (same SQL as the legacy Express routes).
- `dashboard/src/lib/components/` — Svelte components (Plotly charts, KPI cards, tables).
- `server/` — Legacy Express API (kept as reference, no longer used by Makefile).
- `web/` — Legacy static dashboard (kept as reference).
- `docs/ROADMAP.md` — Capability roadmap with scope triage.

## Running Locally

```bash
# Full setup + ETL + models + dashboard
make all

# Or step by step:
make install         # creates .venv, installs Python deps + dashboard npm deps
make etl             # runs Sleeper/FC/DP pipeline
make models          # points_model, lineup_solver, outcomes, cornering
make server          # SvelteKit dashboard at http://localhost:3000
make dev             # same as server (with HMR)
make dashboard-test  # vitest unit tests
make dashboard-e2e   # playwright end-to-end tests
make clean           # nuke .venv, node_modules, DB
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
