import tempfile
from pathlib import Path

import pandas as pd

from etl_v2.config import Config
from etl_v2.output.csv import write_csv
from etl_v2.output.db import get_engine, upsert

# --- CSV output ---


def test_write_csv_creates_file():
    with tempfile.TemporaryDirectory() as tmp:
        cfg = Config()
        cfg.csv_dir = Path(tmp) / "out"
        df = pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"]})
        path = write_csv(cfg, "test_table", df)
        assert path.exists()
        assert path.name == "test_table.csv"
        result = pd.read_csv(path)
        assert list(result.columns) == ["a", "b"]
        assert len(result) == 3


def test_write_csv_creates_directory():
    with tempfile.TemporaryDirectory() as tmp:
        cfg = Config()
        cfg.csv_dir = Path(tmp) / "nested" / "dir"
        df = pd.DataFrame({"col": [1]})
        path = write_csv(cfg, "nested_test", df)
        assert path.exists()


def test_write_csv_overwrites_existing():
    with tempfile.TemporaryDirectory() as tmp:
        cfg = Config()
        cfg.csv_dir = Path(tmp)
        df1 = pd.DataFrame({"a": [1]})
        df2 = pd.DataFrame({"a": [2, 3]})
        write_csv(cfg, "overwrite", df1)
        path = write_csv(cfg, "overwrite", df2)
        result = pd.read_csv(path)
        assert len(result) == 2
        assert result["a"].tolist() == [2, 3]


def test_write_csv_empty_dataframe():
    with tempfile.TemporaryDirectory() as tmp:
        cfg = Config()
        cfg.csv_dir = Path(tmp)
        df = pd.DataFrame({"a": pd.Series(dtype="int"), "b": pd.Series(dtype="str")})
        path = write_csv(cfg, "empty", df)
        assert path.exists()
        result = pd.read_csv(path)
        assert len(result) == 0
        assert list(result.columns) == ["a", "b"]


# --- DB output ---


def test_get_engine_uses_config():
    with tempfile.TemporaryDirectory() as tmp:
        cfg = Config()
        cfg.db_path = Path(tmp) / "test.db"
        engine = get_engine(cfg)
        assert "test.db" in str(engine.url)


def test_upsert_inserts_data():
    with tempfile.TemporaryDirectory() as tmp:
        from sqlalchemy import create_engine, text

        db_path = Path(tmp) / "test.db"
        engine = create_engine(f"sqlite:///{db_path}")
        with engine.begin() as conn:
            conn.execute(text("CREATE TABLE t (id TEXT PRIMARY KEY, val INT)"))

        df = pd.DataFrame({"id": ["a", "b"], "val": [1, 2]})
        upsert(engine, "t", df, ["id"])

        with engine.connect() as conn:
            rows = conn.execute(text("SELECT * FROM t ORDER BY id")).fetchall()
        assert rows == [("a", 1), ("b", 2)]


def test_upsert_updates_on_conflict():
    with tempfile.TemporaryDirectory() as tmp:
        from sqlalchemy import create_engine, text

        db_path = Path(tmp) / "test.db"
        engine = create_engine(f"sqlite:///{db_path}")
        with engine.begin() as conn:
            conn.execute(text("CREATE TABLE t (id TEXT PRIMARY KEY, val INT)"))
            conn.execute(text("INSERT INTO t VALUES ('a', 1)"))

        df = pd.DataFrame({"id": ["a", "b"], "val": [99, 2]})
        upsert(engine, "t", df, ["id"])

        with engine.connect() as conn:
            rows = conn.execute(text("SELECT * FROM t ORDER BY id")).fetchall()
        assert rows == [("a", 99), ("b", 2)]


def test_upsert_skips_empty_dataframe():
    with tempfile.TemporaryDirectory() as tmp:
        from sqlalchemy import create_engine, text

        db_path = Path(tmp) / "test.db"
        engine = create_engine(f"sqlite:///{db_path}")
        with engine.begin() as conn:
            conn.execute(text("CREATE TABLE t (id TEXT PRIMARY KEY, val INT)"))

        df = pd.DataFrame({"id": pd.Series(dtype="str"), "val": pd.Series(dtype="int")})
        upsert(engine, "t", df, ["id"])

        with engine.connect() as conn:
            count = conn.execute(text("SELECT COUNT(*) FROM t")).fetchone()[0]
        assert count == 0


def test_upsert_handles_null_values():
    with tempfile.TemporaryDirectory() as tmp:
        from sqlalchemy import create_engine, text

        db_path = Path(tmp) / "test.db"
        engine = create_engine(f"sqlite:///{db_path}")
        with engine.begin() as conn:
            conn.execute(text("CREATE TABLE t (id TEXT PRIMARY KEY, val INT)"))

        df = pd.DataFrame({"id": ["a", "b"], "val": [None, 2]})
        upsert(engine, "t", df, ["id"])

        with engine.connect() as conn:
            rows = conn.execute(text("SELECT * FROM t ORDER BY id")).fetchall()
        assert rows[0] == ("a", None)
        assert rows[1] == ("b", 2)
