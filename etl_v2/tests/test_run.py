from unittest.mock import patch

from etl_v2.config import Config
from etl_v2.run import STEPS, build_parser, main, resolve_steps, run_step

# --- CLI parsing ---


def test_default_runs_all_steps():
    args = build_parser().parse_args(["--output", "db"])
    steps = resolve_steps(args)
    assert steps == STEPS


def test_skip_flag_removes_step():
    args = build_parser().parse_args(["--output", "csv", "--skip-extract"])
    steps = resolve_steps(args)
    assert "extract" not in steps
    assert "points_model" in steps


def test_only_flag_overrides_all():
    args = build_parser().parse_args(["--output", "db", "--only", "extract", "cornering"])
    steps = resolve_steps(args)
    assert steps == ["extract", "cornering"]


def test_output_choices():
    args = build_parser().parse_args(["--output", "csv"])
    assert args.output == "csv"
    args = build_parser().parse_args(["--output", "db"])
    assert args.output == "db"


def test_skip_multiple_steps():
    args = build_parser().parse_args(["--output", "db", "--skip-extract", "--skip-cornering"])
    steps = resolve_steps(args)
    assert "extract" not in steps
    assert "cornering" not in steps
    assert "points_model" in steps


def test_dry_run_flag():
    args = build_parser().parse_args(["--output", "db", "--dry-run"])
    assert args.dry_run is True


# --- Config ---


def test_config_defaults():
    cfg = Config()
    assert "sleeper.app" in cfg.sleeper_base_url
    assert "fantasycalc.com" in cfg.fantasycalc_base_url
    assert cfg.output == "db"
    assert cfg.data_dir.name == "data"


def test_config_database_url_fallback():
    cfg = Config()
    assert "dynasty.db" in cfg.database_url


def test_config_database_url_from_env():
    with patch.dict("os.environ", {"DATABASE_URL": "postgresql://localhost/test"}):
        cfg = Config()
        assert cfg.database_url == "postgresql://localhost/test"


def test_config_env_overrides():
    with patch.dict(
        "os.environ",
        {
            "SLEEPER_BASE_URL": "http://custom-sleeper.example.com",
            "FANTASYCALC_BASE_URL": "http://custom-fc.example.com",
            "DP_BASE_URL": "http://custom-dp.example.com",
        },
    ):
        cfg = Config()
        assert cfg.sleeper_base_url == "http://custom-sleeper.example.com"
        assert cfg.fantasycalc_base_url == "http://custom-fc.example.com"
        assert cfg.dp_base_url == "http://custom-dp.example.com"


def test_config_path_overrides():
    with patch.dict(
        "os.environ",
        {
            "DATA_DIR": "/tmp/test_data",
            "DB_PATH": "/tmp/test.db",
            "CSV_OUTPUT_DIR": "/tmp/test_csv",
        },
    ):
        cfg = Config()
        assert str(cfg.data_dir) == "/tmp/test_data"
        assert str(cfg.db_path) == "/tmp/test.db"
        assert str(cfg.csv_dir) == "/tmp/test_csv"


def test_config_boolean_parsing():
    with patch.dict("os.environ", {"BACKFILL_PREVIOUS_SEASONS": "false"}):
        cfg = Config()
        assert cfg.backfill_previous_seasons is False


def test_config_int_parsing():
    with patch.dict(
        "os.environ",
        {
            "PLAYER_CACHE_TTL_HOURS": "48",
            "OUTCOMES_FIRST_SEASON": "2020",
            "OUTCOMES_LAST_SEASON": "2024",
        },
    ):
        cfg = Config()
        assert cfg.player_cache_ttl_hours == 48
        assert cfg.outcomes_first_season == 2020
        assert cfg.outcomes_last_season == 2024


# --- run_step dispatches correctly ---


@patch("etl_v2.steps.extract.run_extract")
def test_run_step_extract(mock_extract):
    cfg = Config()
    run_step("extract", cfg, dry_run=True)
    mock_extract.assert_called_once_with(cfg, True)


@patch("etl_v2.steps.points_model.run_points_model")
def test_run_step_points_model(mock_pm):
    cfg = Config()
    run_step("points_model", cfg, dry_run=False)
    mock_pm.assert_called_once_with(cfg)


@patch("etl_v2.steps.lineup_solver.run_lineup_solver")
def test_run_step_lineup_solver(mock_ls):
    cfg = Config()
    run_step("lineup_solver", cfg, dry_run=False)
    mock_ls.assert_called_once_with(cfg)


@patch("etl_v2.steps.dp_archive.run_dp_archive")
def test_run_step_dp_archive(mock_dp):
    cfg = Config()
    run_step("dp_archive", cfg, dry_run=False)
    mock_dp.assert_called_once_with(cfg)


@patch("etl_v2.steps.outcomes.run_outcomes")
def test_run_step_outcomes(mock_out):
    cfg = Config()
    run_step("outcomes", cfg, dry_run=False)
    mock_out.assert_called_once_with(cfg)


@patch("etl_v2.steps.backtest.run_backtest")
def test_run_step_backtest(mock_bt):
    cfg = Config()
    run_step("backtest", cfg, dry_run=False)
    mock_bt.assert_called_once_with(cfg)


@patch("etl_v2.steps.projection_model.run_projection_model")
def test_run_step_projection_model(mock_pm):
    cfg = Config()
    run_step("projection_model", cfg, dry_run=False)
    mock_pm.assert_called_once_with(cfg)


@patch("etl_v2.steps.projections.run_projections")
def test_run_step_projections(mock_proj):
    cfg = Config()
    run_step("projections", cfg, dry_run=False)
    mock_proj.assert_called_once_with(cfg)


@patch("etl_v2.steps.cornering.run_cornering")
def test_run_step_cornering(mock_corn):
    cfg = Config()
    run_step("cornering", cfg, dry_run=False)
    mock_corn.assert_called_once_with(cfg)


# --- main() orchestration ---


@patch("etl_v2.run.run_step")
def test_main_runs_all_steps(mock_run_step):
    with patch("sys.argv", ["run.py", "--output", "db"]):
        result = main()
    assert result == 0
    assert mock_run_step.call_count == len(STEPS)
    called_steps = [call.args[0] for call in mock_run_step.call_args_list]
    assert called_steps == STEPS


@patch("etl_v2.run.run_step")
def test_main_with_only(mock_run_step):
    with patch("sys.argv", ["run.py", "--output", "csv", "--only", "extract"]):
        result = main()
    assert result == 0
    mock_run_step.assert_called_once()
    assert mock_run_step.call_args.args[0] == "extract"


@patch("etl_v2.run.run_step", side_effect=Exception("boom"))
def test_main_returns_1_on_failure(mock_run_step):
    with patch("sys.argv", ["run.py", "--output", "db", "--only", "extract"]):
        result = main()
    assert result == 1


@patch("etl_v2.run.run_step", side_effect=SystemExit("missing config"))
def test_main_returns_1_on_system_exit(mock_run_step):
    with patch("sys.argv", ["run.py", "--output", "db", "--only", "extract"]):
        result = main()
    assert result == 1


@patch("etl_v2.run.run_step")
def test_main_passes_dry_run(mock_run_step):
    with patch("sys.argv", ["run.py", "--output", "db", "--only", "extract", "--dry-run"]):
        main()
    assert mock_run_step.call_args.args[2] is True


@patch("etl_v2.run.run_step")
def test_main_sets_output_on_config(mock_run_step):
    with patch("sys.argv", ["run.py", "--output", "csv", "--only", "extract"]):
        main()
    cfg = mock_run_step.call_args.args[1]
    assert cfg.output == "csv"
