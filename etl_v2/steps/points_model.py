from __future__ import annotations

import os
import sys
from pathlib import Path

from etl_v2.config import Config

_PROJECT_ROOT = str(Path(__file__).resolve().parents[2])


def run_points_model(cfg: Config) -> None:
    os.environ["DATA_DIR"] = str(cfg.data_dir)
    os.environ["DATABASE_URL"] = cfg.database_url

    if _PROJECT_ROOT not in sys.path:
        sys.path.insert(0, _PROJECT_ROOT)
    import etl.points_model as pm

    pm.NFLVERSE = cfg.nflverse_stats_url
    pm.CROSSWALK = cfg.dp_crosswalk_url
    pm.DATA_DIR = cfg.data_dir

    pm.run()
