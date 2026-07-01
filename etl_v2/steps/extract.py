from __future__ import annotations

import os
import sys
from pathlib import Path

from etl_v2.config import Config

_PROJECT_ROOT = str(Path(__file__).resolve().parents[2])


def run_extract(cfg: Config, dry_run: bool = False) -> None:
    os.environ["DATA_DIR"] = str(cfg.data_dir)
    os.environ["SLEEPER_USERNAME"] = cfg.sleeper_username
    os.environ["SLEEPER_USER_ID"] = cfg.sleeper_user_id
    if cfg.sleeper_season:
        os.environ["SLEEPER_SEASON"] = cfg.sleeper_season
    os.environ["LEAGUE_ID_FILTER"] = cfg.league_id_filter
    os.environ["BACKFILL_PREVIOUS_SEASONS"] = str(cfg.backfill_previous_seasons).lower()
    os.environ["PLAYER_CACHE_TTL_HOURS"] = str(cfg.player_cache_ttl_hours)
    if cfg.output == "csv":
        os.environ["EXPORT_CSV"] = "true"
        os.environ["EXTRACT_DIR"] = str(cfg.csv_dir)
    else:
        os.environ["EXPORT_CSV"] = "false"
    os.environ["DATABASE_URL"] = cfg.database_url

    if _PROJECT_ROOT not in sys.path:
        sys.path.insert(0, _PROJECT_ROOT)
    import etl.etl_pipeline as pipeline

    pipeline.SLEEPER_BASE = cfg.sleeper_base_url
    pipeline.FANTASYCALC_BASE = cfg.fantasycalc_base_url
    pipeline.DP_BASE = cfg.dp_base_url
    pipeline.USER_AGENT = cfg.user_agent
    pipeline.DATA_DIR = cfg.data_dir

    pipeline.run(dry_run=dry_run)
