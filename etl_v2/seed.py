"""
etl_v2/seed.py — Load CSV files into the database via upsert.

Reads all .csv files from the configured CSV_OUTPUT_DIR (or --from path),
matches filenames to table names, and upserts into the DB.

Usage:
    python -m etl_v2.run --input csv                    # seed from CSV_OUTPUT_DIR
    python -m etl_v2.run --input csv --from /path/to/csvs  # seed from custom path
"""
from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from etl_v2.config import Config
from etl_v2.output.db import get_engine, upsert

log = logging.getLogger("etl_v2.seed")

TABLE_KEYS: dict[str, list[str]] = {
    "dim_leagues": ["league_id"],
    "dim_managers": ["league_id", "roster_id"],
    "dim_players": ["player_id"],
    "dim_draft_picks": ["pick_id"],
    "fact_roster_historical_value": ["snapshot_date", "league_id", "roster_id", "player_id"],
    "fact_transactions": ["transaction_id", "roster_id", "player_id", "leg"],
    "player_production_value": ["league_id", "player_id", "season"],
    "roster_lineup_optimal": ["snapshot_date", "league_id", "roster_id", "slot", "slot_seq"],
    "roster_surplus": ["snapshot_date", "league_id", "roster_id", "player_id"],
    "roster_construction": ["snapshot_date", "league_id", "roster_id"],
    "outcomes": ["league_id", "sleeper_id", "season", "week"],
    "nfl_week_calendar": ["season", "week"],
    "dp_values_history": ["knowledge_date", "player_key"],
    "player_projected_value": ["as_of_date", "league_id", "player_id"],
    "positional_cornering": ["basis", "as_of_date", "league_id", "position", "roster_id"],
    "positional_cornering_league": ["basis", "as_of_date", "league_id", "position"],
}

LOAD_ORDER = [
    "dim_leagues",
    "dim_players",
    "dim_managers",
    "dim_draft_picks",
    "fact_roster_historical_value",
    "fact_transactions",
    "player_production_value",
    "roster_lineup_optimal",
    "roster_surplus",
    "roster_construction",
    "outcomes",
    "nfl_week_calendar",
    "dp_values_history",
    "player_projected_value",
    "positional_cornering",
    "positional_cornering_league",
]


def seed_from_csv(cfg: Config, csv_path: Path | None = None) -> None:
    source = csv_path or cfg.csv_dir
    if not source.exists():
        raise SystemExit(f"CSV directory does not exist: {source}")

    csv_files = sorted(source.glob("*.csv"))
    if not csv_files:
        raise SystemExit(f"No .csv files found in: {source}")

    engine = get_engine(cfg)

    file_map = {f.stem: f for f in csv_files}

    loaded = 0
    skipped = []

    for table in LOAD_ORDER:
        if table not in file_map:
            continue
        keys = TABLE_KEYS.get(table)
        if not keys:
            skipped.append(table)
            continue
        df = pd.read_csv(file_map[table], dtype=str)
        # Drop columns that are computed (like roster_key from Power BI exports)
        extra_cols = [c for c in df.columns if c not in _get_table_columns(df, keys)]
        df = df[[c for c in df.columns if c not in ["roster_key"]]]
        log.info("Seeding %s from %s (%d rows)", table, file_map[table].name, len(df))
        upsert(engine, table, df, keys)
        loaded += 1

    # Also load any remaining files not in LOAD_ORDER
    for name, path in file_map.items():
        if name in LOAD_ORDER:
            continue
        if name.startswith("v_"):
            log.info("Skipping view export: %s", name)
            continue
        keys = TABLE_KEYS.get(name)
        if not keys:
            skipped.append(name)
            continue
        df = pd.read_csv(path, dtype=str)
        df = df[[c for c in df.columns if c != "roster_key"]]
        log.info("Seeding %s from %s (%d rows)", name, path.name, len(df))
        upsert(engine, name, df, keys)
        loaded += 1

    log.info("Seed complete: %d tables loaded", loaded)
    if skipped:
        log.warning("Skipped (no primary key mapping): %s", skipped)


def _get_table_columns(df: pd.DataFrame, keys: list[str]) -> set[str]:
    return set(df.columns)
