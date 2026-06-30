#!/usr/bin/env python3
"""
etl_v2/run.py — single orchestrator entrypoint for the dynasty ETL pipeline.

Usage:
    python -m etl_v2.run --output db                     # full pipeline, DB output
    python -m etl_v2.run --output csv                    # full pipeline, CSV output
    python -m etl_v2.run --output db --skip-projections  # skip one step
    python -m etl_v2.run --output csv --only extract     # run only one step
    python -m etl_v2.run --input csv                     # seed DB from CSVs
    python -m etl_v2.run --input csv --from ./exports    # seed from custom path
"""
from __future__ import annotations

import argparse
import logging
import sys
import time

from etl_v2.config import Config

STEPS = [
    "extract",
    "points_model",
    "lineup_solver",
    "dp_archive",
    "outcomes",
    "projections",
    "cornering",
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
log = logging.getLogger("etl_v2")


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        description="Dynasty portfolio ETL orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument(
        "--output", choices=["db", "csv"], default="db",
        help="Output target: 'db' writes to SQLite/Postgres, 'csv' writes flat files (mutually exclusive)",
    )
    ap.add_argument(
        "--input", choices=["csv"], default=None, dest="input_mode",
        help="Seed DB from CSV files instead of running the pipeline",
    )
    ap.add_argument(
        "--from", dest="csv_source", default=None,
        help="Path to CSV directory (used with --input csv; defaults to CSV_OUTPUT_DIR)",
    )
    ap.add_argument(
        "--only", choices=STEPS, nargs="+",
        help="Run ONLY these steps (overrides --skip-* flags)",
    )
    ap.add_argument("--dry-run", action="store_true", help="Extract + transform, skip all writes")
    for step in STEPS:
        ap.add_argument(f"--skip-{step.replace('_', '-')}", action="store_true",
                        help=f"Skip the {step} step")
    return ap


def resolve_steps(args: argparse.Namespace) -> list[str]:
    if args.only:
        return args.only
    return [s for s in STEPS if not getattr(args, f"skip_{s.replace('-', '_')}", False)]


def run_step(name: str, cfg: Config, dry_run: bool) -> None:
    log.info("=== STEP: %s ===", name)
    t0 = time.time()

    if name == "extract":
        from etl_v2.steps.extract import run_extract
        run_extract(cfg, dry_run)
    elif name == "points_model":
        from etl_v2.steps.points_model import run_points_model
        run_points_model(cfg)
    elif name == "lineup_solver":
        from etl_v2.steps.lineup_solver import run_lineup_solver
        run_lineup_solver(cfg)
    elif name == "dp_archive":
        from etl_v2.steps.dp_archive import run_dp_archive
        run_dp_archive(cfg)
    elif name == "outcomes":
        from etl_v2.steps.outcomes import run_outcomes
        run_outcomes(cfg)
    elif name == "projections":
        from etl_v2.steps.projections import run_projections
        run_projections(cfg)
    elif name == "cornering":
        from etl_v2.steps.cornering import run_cornering
        run_cornering(cfg)

    log.info("=== DONE: %s (%.1fs) ===", name, time.time() - t0)


def main() -> int:
    ap = build_parser()
    args = ap.parse_args()

    cfg = Config()
    cfg.output = args.output
    cfg.data_dir.mkdir(parents=True, exist_ok=True)

    if args.input_mode == "csv":
        from pathlib import Path
        from etl_v2.seed import seed_from_csv
        csv_path = Path(args.csv_source) if args.csv_source else None
        log.info("Seeding DB from CSVs: %s", csv_path or cfg.csv_dir)
        try:
            seed_from_csv(cfg, csv_path)
        except SystemExit as e:
            log.error("Seed failed: %s", e)
            return 1
        return 0

    steps = resolve_steps(args)
    log.info("Pipeline starting — output=%s, steps=%s", cfg.output, steps)

    for step in steps:
        try:
            run_step(step, cfg, args.dry_run)
        except SystemExit as e:
            log.error("Step '%s' exited with: %s", step, e)
            return 1
        except Exception:
            log.exception("Step '%s' failed", step)
            return 1

    log.info("Pipeline complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
