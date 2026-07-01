from __future__ import annotations

import sys
from pathlib import Path

from etl_v2.config import Config

_PROJECT_ROOT = str(Path(__file__).resolve().parents[2])
_ETL_DIR = str(Path(__file__).resolve().parents[2] / "etl")


def run_backtest(cfg: Config) -> None:
    if _PROJECT_ROOT not in sys.path:
        sys.path.insert(0, _PROJECT_ROOT)
    if _ETL_DIR not in sys.path:
        sys.path.insert(0, _ETL_DIR)
    import etl.backtest_baselines as backtest

    sys.argv = ["backtest_baselines", "--db", str(cfg.db_path)]
    backtest.main()
