from __future__ import annotations

import sys
from pathlib import Path

from etl_v2.config import Config

_PROJECT_ROOT = str(Path(__file__).resolve().parents[2])


def run_lineup_solver(cfg: Config) -> None:
    if _PROJECT_ROOT not in sys.path:
        sys.path.insert(0, _PROJECT_ROOT)
    import etl.lineup_solver as solver

    sys.argv = ["lineup_solver", "--db", str(cfg.db_path)]
    solver.main()
