from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

try:
    from dotenv import load_dotenv, find_dotenv
    _env_path = find_dotenv(usecwd=True)
    _enc = "utf-8"
    if _env_path:
        _bom = open(_env_path, "rb").read(3)
        if _bom[:2] in (b"\xff\xfe", b"\xfe\xff"):
            _enc = "utf-16"
        elif _bom == b"\xef\xbb\xbf":
            _enc = "utf-8-sig"
    load_dotenv(_env_path or None, encoding=_enc)
except ImportError:
    pass


@dataclass
class Config:
    sleeper_base_url: str = field(default_factory=lambda: os.getenv("SLEEPER_BASE_URL", "https://api.sleeper.app/v1"))
    sleeper_username: str = field(default_factory=lambda: os.getenv("SLEEPER_USERNAME", ""))
    sleeper_user_id: str = field(default_factory=lambda: os.getenv("SLEEPER_USER_ID", ""))
    sleeper_season: str = field(default_factory=lambda: os.getenv("SLEEPER_SEASON", ""))

    fantasycalc_base_url: str = field(default_factory=lambda: os.getenv("FANTASYCALC_BASE_URL", "https://api.fantasycalc.com"))

    dp_base_url: str = field(default_factory=lambda: os.getenv("DP_BASE_URL", "https://raw.githubusercontent.com/dynastyprocess/data/master/files"))
    dp_repo_url: str = field(default_factory=lambda: os.getenv("DP_REPO_URL", "https://github.com/dynastyprocess/data.git"))
    dp_crosswalk_url: str = field(default_factory=lambda: os.getenv("DP_CROSSWALK_URL", "https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv"))

    nflverse_stats_url: str = field(default_factory=lambda: os.getenv("NFLVERSE_STATS_URL", "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{season}.csv"))

    data_dir: Path = field(default_factory=lambda: Path(os.getenv("DATA_DIR", "etl/data")))
    db_path: Path = field(default_factory=lambda: Path(os.getenv("DB_PATH", "etl/data/dynasty.db")))
    csv_dir: Path = field(default_factory=lambda: Path(os.getenv("CSV_OUTPUT_DIR", "etl/data/csv")))

    output: str = "db"

    user_agent: str = field(default_factory=lambda: os.getenv("ETL_USER_AGENT", "dynasty-portfolio-etl/2.0 (+analytics-portfolio-project)"))
    player_cache_ttl_hours: int = field(default_factory=lambda: int(os.getenv("PLAYER_CACHE_TTL_HOURS", "24")))
    league_id_filter: str = field(default_factory=lambda: os.getenv("LEAGUE_ID_FILTER", ""))
    backfill_previous_seasons: bool = field(default_factory=lambda: os.getenv("BACKFILL_PREVIOUS_SEASONS", "true").lower() == "true")
    dp_archive_since: str = field(default_factory=lambda: os.getenv("DP_ARCHIVE_SINCE", "2019-01-01"))
    outcomes_first_season: int = field(default_factory=lambda: int(os.getenv("OUTCOMES_FIRST_SEASON", "2019")))
    outcomes_last_season: int = field(default_factory=lambda: int(os.getenv("OUTCOMES_LAST_SEASON", "2025")))

    @property
    def database_url(self) -> str:
        url = os.getenv("DATABASE_URL", "").strip()
        if url:
            return url
        return f"sqlite:///{self.db_path.as_posix()}"
