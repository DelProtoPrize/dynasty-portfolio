from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from etl_v2.config import Config

log = logging.getLogger("etl_v2.output.csv")


def write_csv(cfg: Config, name: str, df: pd.DataFrame) -> Path:
    cfg.csv_dir.mkdir(parents=True, exist_ok=True)
    path = cfg.csv_dir / f"{name}.csv"
    df.to_csv(path, index=False, encoding="utf-8")
    log.info("CSV: %s -> %s (%d rows)", name, path, len(df))
    return path
