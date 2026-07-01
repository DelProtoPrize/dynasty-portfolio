# Dynasty Portfolio

Dynasty fantasy football roster analytics platform — treats rosters like financial asset portfolios (valuation, concentration, arbitrage, risk, trajectory).

## Architecture

```
Sleeper API / FantasyCalc / DynastyProcess
        ↓
  ETL (Python) → SQLite warehouse → SvelteKit (API + SSR dashboard + Plotly)
```

The browser only talks to our SvelteKit server. External sources are consumed exclusively by the ETL.

## Project Layout

- `etl_v2/` — Orchestrated ETL pipeline. Single entrypoint: `python -m etl_v2.run --output db|csv`.
- `etl_v2/config.py` — Centralized config (all URLs, paths, constants from `.env`).
- `etl_v2/steps/` — Adapter modules that call into the original `etl/` scripts.
- `etl_v2/output/` — DB (upsert) and CSV output writers.
- `etl_v2/tests/` — Unit tests (pytest, 98% coverage).
- `etl/` — Original Python scripts (pandas, SQLAlchemy, SQLite). Called by `etl_v2/steps/`.
- `etl/schema.sql` — Star schema (fact_roster_historical_value, fact_transactions, dims, views).
- `.env.example` — Documented template of all environment variables.
- `dashboard/` — SvelteKit app (TypeScript, Svelte 5, Tailwind CSS v4, shadcn-svelte UI components).
- `dashboard/src/lib/server/db.ts` — Data layer (better-sqlite3 locally, pg in prod via `DATABASE_URL`).
- `dashboard/src/routes/api/` — REST endpoints (same SQL as the legacy Express routes).
- `dashboard/src/lib/components/` — Svelte components (Plotly charts, KPI cards, tables).
- `dashboard/src/lib/components/ui/` — Reusable UI primitives (Table, Card, Badge, Button, Tabs).
- `scripts/` — Cross-platform Node helpers (`setup.mjs`, `run-python.mjs`).
- `server/` — Legacy Express API (kept as reference, no longer used).
- `web/` — Legacy static dashboard (kept as reference).
- `docs/ROADMAP.md` — Capability roadmap with scope triage.

## Running Locally

```bash
# Copy and fill in your env vars:
cp .env.example .env

# Cross-platform (npm scripts — works on Windows + Mac):
npm run setup        # creates .venv, installs Python deps + dashboard npm deps
npm run all          # ETL + models + dashboard at http://localhost:3000
npm run dev          # just the dashboard (skip ETL/models if DB exists)
npm test             # vitest unit tests
npm run test:e2e     # playwright end-to-end tests

# Mac only (Makefile):
make all             # full pipeline + dashboard at http://localhost:3000
make pipeline        # ETL v2 orchestrator (all steps, DB output)
make pipeline-csv    # ETL v2 orchestrator (all steps, CSV output)
make test            # etl_v2 unit tests + dashboard vitest
make test-etl        # etl_v2 tests with coverage
make clean           # nuke .venv, node_modules, DB

# ETL v2 CLI directly:
python -m etl_v2.run --output db                    # full pipeline, DB output
python -m etl_v2.run --output csv                   # full pipeline, CSV output
python -m etl_v2.run --output db --skip-projections # skip a step
python -m etl_v2.run --output db --only extract     # run one step
python -m etl_v2.run --output db --dry-run          # extract + transform, no writes
```

## Key Technical Decisions

- SQLite locally (zero config), Postgres in prod — same ETL/API code for both.
- No TE-premium multiplier applied at the data layer. TEP is computed downstream of projection models.
- Market values are snapshot facts (appended each ETL run). History accrues forward.
- Heavy math (DCF, projections, risk models) lives in Python; SvelteKit serves pre-computed results.
- Star schema: dims loaded before facts; FK enforcement optional via pragma.
- Tailwind CSS v4 with `@theme` tokens for design consistency. No custom `<style>` blocks in components.
- shadcn-svelte pattern for UI primitives (Table, Card, Badge, Button, Tabs) — keeps styling consistent across pages without the green dev needing to know CSS.
- Plotly.js for specialized charts (scatter, bar, pie, heatmap) via a thin `PlotlyChart.svelte` wrapper.

## Conventions

- Dashboard uses SvelteKit with Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`).
- All components use Tailwind utility classes — no inline `<style>` blocks.
- ETL writes to `etl/data/dynasty.db` (gitignored).
- Environment: all config lives in project root `.env` (see `.env.example` for all supported vars).
- No hardcoded URLs or API endpoints — all externalized to env vars via `etl_v2/config.py`.
- Data sources are all public/unauthenticated (Sleeper, DynastyProcess, FantasyCalc).
- `scripts/run-python.mjs` auto-detects OS and venv path — one set of npm scripts for all platforms.
- ETL pipeline execution order: extract → points_model → lineup_solver → dp_archive → outcomes → projections → cornering.
