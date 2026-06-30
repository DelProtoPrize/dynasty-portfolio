from __future__ import annotations

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from etl_v2.config import Config


def get_engine(cfg: Config) -> Engine:
    return create_engine(cfg.database_url, pool_pre_ping=True)


def upsert(engine: Engine, table: str, df: pd.DataFrame, conflict_cols: list[str]) -> None:
    if df.empty:
        return
    df = df.where(pd.notna(df), None)
    staging = f"_stg_{table}"
    with engine.begin() as conn:
        df.to_sql(staging, conn, if_exists="replace", index=False)
        cols = list(df.columns)
        collist = ", ".join(f'"{c}"' for c in cols)
        updates = ", ".join(f'"{c}" = EXCLUDED."{c}"' for c in cols if c not in conflict_cols)
        conflict = ", ".join(f'"{c}"' for c in conflict_cols)
        action = f"DO UPDATE SET {updates}" if updates else "DO NOTHING"
        conn.execute(text(
            f'INSERT INTO {table} ({collist}) SELECT {collist} FROM {staging} '
            f'WHERE true ON CONFLICT ({conflict}) {action}'
        ))
        conn.execute(text(f"DROP TABLE IF EXISTS {staging}"))
