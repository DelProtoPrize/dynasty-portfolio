import tempfile
from pathlib import Path
from unittest.mock import patch

import pandas as pd
import pytest
from sqlalchemy import create_engine, text

from etl_v2.config import Config
from etl_v2.seed import seed_from_csv, TABLE_KEYS, LOAD_ORDER
from etl_v2.run import build_parser, main


def _make_db(tmp: str) -> Path:
    db_path = Path(tmp) / "test.db"
    engine = create_engine(f"sqlite:///{db_path}")
    with engine.begin() as conn:
        conn.execute(text(
            "CREATE TABLE dim_leagues (league_id TEXT PRIMARY KEY, league_name TEXT, season TEXT)"
        ))
        conn.execute(text(
            "CREATE TABLE dim_players (player_id TEXT PRIMARY KEY, player_name TEXT, position TEXT)"
        ))
        conn.execute(text(
            "CREATE TABLE dim_managers (league_id TEXT, roster_id TEXT, owner_name TEXT, PRIMARY KEY (league_id, roster_id))"
        ))
    return db_path


def test_seed_loads_csv_into_db():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = _make_db(tmp)
        csv_dir = Path(tmp) / "csvs"
        csv_dir.mkdir()

        pd.DataFrame({"league_id": ["lg1"], "league_name": ["Test"], "season": ["2025"]}).to_csv(
            csv_dir / "dim_leagues.csv", index=False
        )
        pd.DataFrame({"player_id": ["p1"], "player_name": ["Player One"], "position": ["QB"]}).to_csv(
            csv_dir / "dim_players.csv", index=False
        )

        cfg = Config()
        cfg.db_path = db_path
        cfg.csv_dir = csv_dir

        seed_from_csv(cfg, csv_dir)

        engine = create_engine(f"sqlite:///{db_path}")
        with engine.connect() as conn:
            leagues = conn.execute(text("SELECT * FROM dim_leagues")).fetchall()
            players = conn.execute(text("SELECT * FROM dim_players")).fetchall()
        assert len(leagues) == 1
        assert leagues[0][0] == "lg1"
        assert len(players) == 1
        assert players[0][1] == "Player One"


def test_seed_upserts_existing_data():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = _make_db(tmp)
        engine = create_engine(f"sqlite:///{db_path}")
        with engine.begin() as conn:
            conn.execute(text("INSERT INTO dim_leagues VALUES ('lg1', 'Old Name', '2024')"))

        csv_dir = Path(tmp) / "csvs"
        csv_dir.mkdir()
        pd.DataFrame({"league_id": ["lg1"], "league_name": ["New Name"], "season": ["2025"]}).to_csv(
            csv_dir / "dim_leagues.csv", index=False
        )

        cfg = Config()
        cfg.db_path = db_path
        cfg.csv_dir = csv_dir

        seed_from_csv(cfg, csv_dir)

        with engine.connect() as conn:
            rows = conn.execute(text("SELECT league_name, season FROM dim_leagues WHERE league_id='lg1'")).fetchall()
        assert rows[0] == ("New Name", "2025")


def test_seed_skips_view_exports():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = _make_db(tmp)
        csv_dir = Path(tmp) / "csvs"
        csv_dir.mkdir()

        pd.DataFrame({"a": [1]}).to_csv(csv_dir / "v_player_market.csv", index=False)
        pd.DataFrame({"league_id": ["lg1"], "league_name": ["X"], "season": ["2025"]}).to_csv(
            csv_dir / "dim_leagues.csv", index=False
        )

        cfg = Config()
        cfg.db_path = db_path
        cfg.csv_dir = csv_dir

        seed_from_csv(cfg, csv_dir)

        engine = create_engine(f"sqlite:///{db_path}")
        with engine.connect() as conn:
            tables = [r[0] for r in conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()]
        assert "v_player_market" not in tables


def test_seed_drops_roster_key_column():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = _make_db(tmp)
        csv_dir = Path(tmp) / "csvs"
        csv_dir.mkdir()

        pd.DataFrame({
            "league_id": ["lg1"], "roster_id": ["1"], "owner_name": ["Bob"], "roster_key": ["lg1-1"]
        }).to_csv(csv_dir / "dim_managers.csv", index=False)

        cfg = Config()
        cfg.db_path = db_path
        cfg.csv_dir = csv_dir

        seed_from_csv(cfg, csv_dir)

        engine = create_engine(f"sqlite:///{db_path}")
        with engine.connect() as conn:
            rows = conn.execute(text("SELECT * FROM dim_managers")).fetchall()
        assert len(rows) == 1
        assert rows[0] == ("lg1", "1", "Bob")


def test_seed_raises_on_missing_directory():
    cfg = Config()
    cfg.csv_dir = Path("/nonexistent/path")
    with pytest.raises(SystemExit, match="does not exist"):
        seed_from_csv(cfg)


def test_seed_raises_on_empty_directory():
    with tempfile.TemporaryDirectory() as tmp:
        csv_dir = Path(tmp) / "empty"
        csv_dir.mkdir()
        cfg = Config()
        cfg.csv_dir = csv_dir
        with pytest.raises(SystemExit, match="No .csv files"):
            seed_from_csv(cfg, csv_dir)


def test_cli_input_csv_triggers_seed():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = _make_db(tmp)
        csv_dir = Path(tmp) / "csvs"
        csv_dir.mkdir()
        pd.DataFrame({"league_id": ["lg1"], "league_name": ["CLI"], "season": ["2025"]}).to_csv(
            csv_dir / "dim_leagues.csv", index=False
        )

        with patch.dict("os.environ", {"DB_PATH": str(db_path), "CSV_OUTPUT_DIR": str(csv_dir)}):
            with patch("sys.argv", ["run.py", "--input", "csv", "--from", str(csv_dir)]):
                result = main()

        assert result == 0
        engine = create_engine(f"sqlite:///{db_path}")
        with engine.connect() as conn:
            rows = conn.execute(text("SELECT league_name FROM dim_leagues")).fetchall()
        assert rows[0][0] == "CLI"


def test_seed_loads_tables_not_in_load_order():
    """Tables with a TABLE_KEYS entry but not in LOAD_ORDER still get seeded."""
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "test.db"
        engine = create_engine(f"sqlite:///{db_path}")
        with engine.begin() as conn:
            conn.execute(text(
                "CREATE TABLE outcomes (league_id TEXT, sleeper_id TEXT, season TEXT, week TEXT, pts TEXT, "
                "PRIMARY KEY (league_id, sleeper_id, season, week))"
            ))

        csv_dir = Path(tmp) / "csvs"
        csv_dir.mkdir()
        pd.DataFrame({
            "league_id": ["lg1"], "sleeper_id": ["s1"], "season": ["2025"], "week": ["1"], "pts": ["12.5"]
        }).to_csv(csv_dir / "outcomes.csv", index=False)

        cfg = Config()
        cfg.db_path = db_path
        cfg.csv_dir = csv_dir

        seed_from_csv(cfg, csv_dir)

        with engine.connect() as conn:
            rows = conn.execute(text("SELECT * FROM outcomes")).fetchall()
        assert len(rows) == 1


def test_seed_skips_unknown_tables_without_keys():
    """CSV files with no TABLE_KEYS mapping get skipped with a warning."""
    with tempfile.TemporaryDirectory() as tmp:
        db_path = _make_db(tmp)
        csv_dir = Path(tmp) / "csvs"
        csv_dir.mkdir()

        pd.DataFrame({"col": [1]}).to_csv(csv_dir / "unknown_table.csv", index=False)
        pd.DataFrame({"league_id": ["lg1"], "league_name": ["X"], "season": ["2025"]}).to_csv(
            csv_dir / "dim_leagues.csv", index=False
        )

        cfg = Config()
        cfg.db_path = db_path
        cfg.csv_dir = csv_dir

        seed_from_csv(cfg, csv_dir)

        engine = create_engine(f"sqlite:///{db_path}")
        with engine.connect() as conn:
            tables = [r[0] for r in conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()]
        assert "unknown_table" not in tables


def test_table_keys_covers_load_order():
    for table in LOAD_ORDER:
        assert table in TABLE_KEYS, f"{table} in LOAD_ORDER but not in TABLE_KEYS"
