from pathlib import Path
import pandas as pd
from .constants import RAW_STAT_MAP

RAW_DATA_DIR = Path(__file__).parent.parent / "data" / "raw"
PROCESSED_DATA_DIR = Path(__file__).parent.parent / "data" / "processed"


def load_raw(filename: str = "historical_games.csv") -> pd.DataFrame:
    df = pd.read_csv(RAW_DATA_DIR / filename)
    df["GAME_DATE"] = pd.to_datetime(df["GAME_DATE"])
    return df


def add_home_away(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["IS_HOME"] = df["MATCHUP"].str.contains("vs.")
    return df


def reshape_to_game_level(df: pd.DataFrame) -> pd.DataFrame:
    # Organizes data so each row of the dataframe represents a single game
    home_rename = {
        "GAME_ID": "game_id",
        "GAME_DATE": "game_date",
        "TEAM_ABBREVIATION": "home_team",
        "WL": "home_wl",
    }
    home_rename.update({raw: f"home_{base}" for raw, base in RAW_STAT_MAP.items()})

    away_rename = {"GAME_ID": "game_id", "TEAM_ABBREVIATION": "away_team"}
    away_rename.update({raw: f"away_{base}" for raw, base in RAW_STAT_MAP.items()})

    home = df[df["IS_HOME"]].rename(columns=home_rename)
    away = df[~df["IS_HOME"]].rename(columns=away_rename)
    
    keep_home = ["game_id", "game_date", "home_team", "home_wl"] + [
        f"home_{c}" for c in RAW_STAT_MAP.values()
    ]
    keep_away = ["game_id", "away_team"] + [f"away_{c}" for c in RAW_STAT_MAP.values()]


    merged = home[keep_home].merge(away[keep_away], on="game_id", how="inner")
    merged["home_win"] = (merged["home_wl"] == "W").astype(int)
    merged = merged.drop(columns=["home_wl"])

    return merged


def validate(df: pd.DataFrame) -> None:
    # Ensures sanity of values
    assert df["game_id"].is_unique, "Duplicate game_id found"
    assert df["home_pts"].notna().all(), "Missing home_pts value"
    assert df["away_pts"].notna().all(), "Missing away_pts value"
    assert df["home_win"].isin([0, 1]).all(), "home_win should only be 0 or 1"

    print(f"Validated {len(df)} games, {df["game_id"].nunique()} unique game ID")


def clean_pipeline(filename: str = "historical_games.csv") -> pd.DataFrame:
    raw = load_raw(filename)
    raw = add_home_away(raw)
    games = reshape_to_game_level(raw)
    validate(games)
    return games


if __name__ == "__main__":
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    games_df = clean_pipeline("nba_games_raw.csv")
    games_df.to_csv(PROCESSED_DATA_DIR / "games_clean.csv", index=False)
    print(f"Saved {len(games_df)} cleaned games")
