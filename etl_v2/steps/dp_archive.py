from __future__ import annotations

import sys
from pathlib import Path

from etl_v2.config import Config

_PROJECT_ROOT = str(Path(__file__).resolve().parents[2])


def run_dp_archive(cfg: Config) -> None:
    if _PROJECT_ROOT not in sys.path:
        sys.path.insert(0, _PROJECT_ROOT)
    import etl.dp_archive_etl as archive

    archive.REPO_URL = cfg.dp_repo_url
    archive.XWALK_URL = cfg.dp_crosswalk_url

    sys.argv = ["dp_archive_etl", "--db", str(cfg.db_path), "--since", cfg.dp_archive_since]
    archive.main()
