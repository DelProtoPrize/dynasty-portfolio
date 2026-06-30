import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

from etl_v2.config import Config

# --- Extract adapter ---


@patch("etl.etl_pipeline.run")
def test_extract_sets_env_and_calls_run(mock_run):
    from etl_v2.steps.extract import run_extract

    cfg = Config()
    cfg.output = "db"
    cfg.sleeper_username = "testuser"
    cfg.sleeper_user_id = "12345"
    cfg.sleeper_season = "2025"
    cfg.league_id_filter = "abc,def"
    cfg.backfill_previous_seasons = False
    cfg.player_cache_ttl_hours = 12

    run_extract(cfg, dry_run=True)

    assert os.environ["SLEEPER_USERNAME"] == "testuser"
    assert os.environ["SLEEPER_USER_ID"] == "12345"
    assert os.environ["SLEEPER_SEASON"] == "2025"
    assert os.environ["LEAGUE_ID_FILTER"] == "abc,def"
    assert os.environ["BACKFILL_PREVIOUS_SEASONS"] == "false"
    assert os.environ["PLAYER_CACHE_TTL_HOURS"] == "12"
    assert os.environ["EXPORT_CSV"] == "false"
    mock_run.assert_called_once_with(dry_run=True)


@patch("etl.etl_pipeline.run")
def test_extract_csv_mode_sets_export_csv(mock_run):
    from etl_v2.steps.extract import run_extract

    cfg = Config()
    cfg.output = "csv"
    cfg.csv_dir = Path("/tmp/csv_out")

    run_extract(cfg, dry_run=False)

    assert os.environ["EXPORT_CSV"] == "true"
    assert os.environ["EXTRACT_DIR"] == "/tmp/csv_out"
    mock_run.assert_called_once_with(dry_run=False)


@patch("etl.etl_pipeline.run")
def test_extract_patches_module_constants(mock_run):
    import etl.etl_pipeline as pipeline
    from etl_v2.steps.extract import run_extract

    cfg = Config()
    cfg.sleeper_base_url = "http://test-sleeper"
    cfg.fantasycalc_base_url = "http://test-fc"
    cfg.dp_base_url = "http://test-dp"
    cfg.user_agent = "test-agent/1.0"
    cfg.data_dir = Path("/tmp/test_data")

    run_extract(cfg, dry_run=True)

    assert pipeline.SLEEPER_BASE == "http://test-sleeper"
    assert pipeline.FANTASYCALC_BASE == "http://test-fc"
    assert pipeline.DP_BASE == "http://test-dp"
    assert pipeline.USER_AGENT == "test-agent/1.0"
    assert pipeline.DATA_DIR == Path("/tmp/test_data")


# --- Points model adapter ---


@patch("etl.points_model.run")
def test_points_model_sets_env_and_calls_run(mock_run):
    from etl_v2.steps.points_model import run_points_model

    cfg = Config()
    cfg.nflverse_stats_url = "http://test-nflverse/{season}"
    cfg.dp_crosswalk_url = "http://test-xwalk"

    run_points_model(cfg)

    assert os.environ["DATABASE_URL"] == cfg.database_url
    mock_run.assert_called_once()


@patch("etl.points_model.run")
def test_points_model_patches_urls(mock_run):
    import etl.points_model as pm
    from etl_v2.steps.points_model import run_points_model

    cfg = Config()
    cfg.nflverse_stats_url = "http://custom-nflverse/{season}"
    cfg.dp_crosswalk_url = "http://custom-xwalk"
    cfg.data_dir = Path("/tmp/pm_data")

    run_points_model(cfg)

    assert pm.NFLVERSE == "http://custom-nflverse/{season}"
    assert pm.CROSSWALK == "http://custom-xwalk"
    assert pm.DATA_DIR == Path("/tmp/pm_data")


# --- Lineup solver adapter ---


@patch("etl.lineup_solver.main", return_value=0)
def test_lineup_solver_sets_argv(mock_main):
    from etl_v2.steps.lineup_solver import run_lineup_solver

    cfg = Config()
    cfg.db_path = Path("/tmp/test.db")

    run_lineup_solver(cfg)

    assert sys.argv == ["lineup_solver", "--db", "/tmp/test.db"]
    mock_main.assert_called_once()


# --- DP archive adapter ---


@patch("etl.dp_archive_etl.main", return_value=0)
def test_dp_archive_sets_argv_and_patches(mock_main):
    import etl.dp_archive_etl as archive
    from etl_v2.steps.dp_archive import run_dp_archive

    cfg = Config()
    cfg.db_path = Path("/tmp/test.db")
    cfg.dp_repo_url = "http://custom-repo.git"
    cfg.dp_crosswalk_url = "http://custom-xwalk"
    cfg.dp_archive_since = "2020-01-01"

    run_dp_archive(cfg)

    assert archive.REPO_URL == "http://custom-repo.git"
    assert archive.XWALK_URL == "http://custom-xwalk"
    assert sys.argv == ["dp_archive_etl", "--db", "/tmp/test.db", "--since", "2020-01-01"]
    mock_main.assert_called_once()


# --- Outcomes adapter ---


@patch("etl.outcomes_etl.main", return_value=0)
def test_outcomes_sets_argv_and_patches(mock_main):
    import etl.outcomes_etl as outcomes
    from etl_v2.steps.outcomes import run_outcomes

    cfg = Config()
    cfg.db_path = Path("/tmp/test.db")
    cfg.nflverse_stats_url = "http://custom-stats/{season}"
    cfg.outcomes_first_season = 2020
    cfg.outcomes_last_season = 2024

    run_outcomes(cfg)

    assert outcomes.STATS_URL == "http://custom-stats/{season}"
    assert sys.argv == ["outcomes_etl", "--db", "/tmp/test.db", "--seasons", "2020", "2024", "--seed-fc"]
    mock_main.assert_called_once()


# --- Projections adapter ---


def test_projections_sets_argv():
    mock_proj = MagicMock()
    mock_proj.main = MagicMock(return_value=0)
    with patch.dict(
        "sys.modules",
        {
            "etl.project_production": mock_proj,
            "backtest_baselines": MagicMock(),
            "projection_model": MagicMock(),
        },
    ):
        # Force reimport of the adapter so it picks up the mocked module
        if "etl_v2.steps.projections" in sys.modules:
            del sys.modules["etl_v2.steps.projections"]
        from etl_v2.steps.projections import run_projections

        cfg = Config()
        cfg.db_path = Path("/tmp/test.db")

        run_projections(cfg)

        assert sys.argv == ["project_production", "--db", "/tmp/test.db"]
        mock_proj.main.assert_called_once()


# --- Backtest adapter ---


def test_backtest_sets_argv():
    mock_bt = MagicMock()
    mock_bt.main = MagicMock(return_value=0)
    with patch.dict(
        "sys.modules",
        {
            "etl.backtest_baselines": mock_bt,
            "build_features": MagicMock(),
        },
    ):
        if "etl_v2.steps.backtest" in sys.modules:
            del sys.modules["etl_v2.steps.backtest"]
        from etl_v2.steps.backtest import run_backtest

        cfg = Config()
        cfg.db_path = Path("/tmp/test.db")

        run_backtest(cfg)

        assert sys.argv == ["backtest_baselines", "--db", "/tmp/test.db"]
        mock_bt.main.assert_called_once()


# --- Projection model adapter ---


def test_projection_model_sets_argv():
    mock_pm = MagicMock()
    mock_pm.main = MagicMock(return_value=0)
    with patch.dict(
        "sys.modules",
        {
            "etl.projection_model": mock_pm,
            "backtest_baselines": MagicMock(),
            "build_features": MagicMock(),
            "projection_model": MagicMock(),
        },
    ):
        if "etl_v2.steps.projection_model" in sys.modules:
            del sys.modules["etl_v2.steps.projection_model"]
        from etl_v2.steps.projection_model import run_projection_model

        cfg = Config()
        cfg.db_path = Path("/tmp/test.db")

        run_projection_model(cfg)

        assert sys.argv == ["projection_model", "--db", "/tmp/test.db"]
        mock_pm.main.assert_called_once()


# --- Cornering adapter ---


@patch("etl.cornering_metrics.main", return_value=0)
def test_cornering_sets_argv(mock_main):
    from etl_v2.steps.cornering import run_cornering

    cfg = Config()
    cfg.db_path = Path("/tmp/test.db")

    run_cornering(cfg)

    assert sys.argv == ["cornering_metrics", "--db", "/tmp/test.db"]
    mock_main.assert_called_once()
