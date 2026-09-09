from pathlib import Path
import pandas as pd

RAW_DATA_DIR = Path(__file__).parent.parent / "data" / "raw"
PROCESSED_DATA_DIR = Path(__file__).parent.parent / "data" / "processed"

def load_raw(filename: str="historical_games.csv") -> pd.DataFrame:
    df = pd.read_csv(RAW_DATA_DIR/filename)
    df["GAME_DATE"] = pd.to_datetime(df["GAME_DATE"])
    return df

def add_home_away(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["IS_HOME"] = df["MATCHUP"].str.contains("vs.")
    return df

def reshape_to_game_level(df: pd.DataFrame) -> pd.DataFrame:
    home = df[df["IS_HOME"]].copy()
    away = df[~df["IS_HOME"]].copy()

    home = home.rename(columns={
        "TEAM_ABBREVIATION": "home_team", "PTS": "home_pts",
        "REB": "home_reb", "AST": "home_ast", "WL": "home_wl"
    })
    away = away.rename(columns={
        "TEAM_ABBREVIATION": "away_team", "PTS": "away_pts",
        "REB": "away_reb", "AST": "away_ast", "WL": "away_wl"
    })

    keep_home = ["GAME_ID", "GAME_DATE", "home_team", "home_pts", "home_reb", "home_ast", "home_wl"]
    keep_away = ["GAME_ID", "away_team", "away_pts", "away_reb", "away_ast"]

    merged = home[keep_home].merge(away[keep_away], on="GAME_ID", how="inner")
    merged["home_win"] = (merged["home_wl"] == "W").astype(int)
    merged = merged.drop(columns=["home_wl"])

    return merged

def validate(df: pd.DataFrame) -> None:
    assert df["GAME_ID"].is_unique, "Duplicate GAME_ID found"
    assert df["home_pts"].notna().all(), "Missing home_pts value"
    assert df["away_pts"].notna().all(), "Missing away_pts value"
    assert df["home_win"].isin([0,1]).all(), "home_win should only be 0 or 1"

    print(f"Validated {len(df)} games, {df["GAME_ID"].nunique()} unique game ID")

def clean_pipeline(filename:str = "historical_games.csv") -> pd.DataFrame:
    raw = load_raw(filename)
    raw = add_home_away(raw)
    games = reshape_to_game_level(raw)
    validate(games)
    return games

if __name__ == "__main__":
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    games_df = clean_pipeline("nba_games_raw.csv")
    games_df.to_csv(PROCESSED_DATA_DIR/"games_clean.csv",index=False)
    print(f"Saved {len(games_df)} cleaned games")