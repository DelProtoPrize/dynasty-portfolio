from __future__ import annotations

import sys
from pathlib import Path

from etl_v2.config import Config

_PROJECT_ROOT = str(Path(__file__).resolve().parents[2])


def run_outcomes(cfg: Config) -> None:
    if _PROJECT_ROOT not in sys.path:
        sys.path.insert(0, _PROJECT_ROOT)
    import etl.outcomes_etl as outcomes

    outcomes.STATS_URL = cfg.nflverse_stats_url

    sys.argv = [
        "outcomes_etl",
        "--db",
        str(cfg.db_path),
        "--seasons",
        str(cfg.outcomes_first_season),
        str(cfg.outcomes_last_season),
        "--seed-fc",
    ]
    outcomes.main()
