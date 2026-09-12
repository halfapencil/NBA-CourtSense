from pathlib import Path
import pandas as pd
from .constants import BASE_STAT_COLS

PROCESSED_DATA_DIR = Path(__file__).parent.parent / "data" / "processed"


from .constants import BASE_STAT_COLS


def to_long_format(games: pd.DataFrame) -> pd.DataFrame:
    # One game = two rows, one for each team
    home_cols = ["game_id", "game_date", "home_team", "away_team", "home_win"] + [
        f"home_{c}" for c in BASE_STAT_COLS
    ]
    home = games[home_cols].copy()
    home_rename = {"home_team": "team", "away_team": "opponent", "home_win": "win"}
    home_rename.update({f"home_{c}": c for c in BASE_STAT_COLS})
    home = home.rename(columns=home_rename)
    home["is_home"] = 1

    away_cols = ["game_id", "game_date", "away_team", "home_team", "home_win"] + [
        f"away_{c}" for c in BASE_STAT_COLS
    ]
    away = games[away_cols].copy()
    away_rename = {"away_team": "team", "home_team": "opponent"}
    away_rename.update({f"away_{c}": c for c in BASE_STAT_COLS})
    away = away.rename(columns=away_rename)
    away["win"] = 1 - away["home_win"]
    away = away.drop(columns=["home_win"])
    away["is_home"] = 0

    long_df = pd.concat([home, away], ignore_index=True)
    return long_df.sort_values(["team", "game_date"]).reset_index(drop=True)


def add_rolling_form(long_df: pd.DataFrame, window: int = 5) -> pd.DataFrame:
    long_df = long_df.copy()
    for col in ["win"] + BASE_STAT_COLS:
        long_df[f"{col}_avg_last{window}"] = long_df.groupby("team")[col].transform(
            lambda s: s.shift(1).rolling(window).mean()
        )
    return long_df


def build_feature_matrix(games: pd.DataFrame, window: int = 5) -> pd.DataFrame:
    long_df = to_long_format(games)
    long_df = add_rolling_form(long_df, window=window)
    long_df = add_rest_days(long_df)

    feature_cols = [f"{c}_avg_last{window}" for c in ["win"] + BASE_STAT_COLS] + [
        "rest_days"
    ]

    home_feats = long_df[long_df["is_home"] == 1][["game_id"] + feature_cols]
    home_feats = home_feats.rename(columns={c: f"home_{c}" for c in feature_cols})
    away_feats = long_df[long_df["is_home"] == 0][["game_id"] + feature_cols]
    away_feats = away_feats.rename(columns={c: f"away_{c}" for c in feature_cols})

    features = games[["game_id", "game_date", "home_team", "away_team", "home_win"]]
    features = features.merge(home_feats, on="game_id").merge(away_feats, on="game_id")
    return features.dropna()


def add_rest_days(long_df: pd.DataFrame) -> pd.DataFrame:
    # Adds number of rest days a team had
    long_df = long_df.copy()
    print(long_df.columns.tolist())
    long_df["prev_game_date"] = long_df.groupby("team")["game_date"].shift(1)
    long_df["rest_days"] = (long_df["game_date"] - long_df["prev_game_date"]).dt.days

    return long_df.drop(columns=["prev_game_date"])


if __name__ == "__main__":
    games = pd.read_csv(
        PROCESSED_DATA_DIR / "games_clean.csv", parse_dates=["game_date"]
    )
    feature_df = build_feature_matrix(games)
    feature_df.to_csv(PROCESSED_DATA_DIR / "features.csv", index=False)
    print(
        f"Saved {len(feature_df)} feature rows ({len(games) - len(feature_df)} early-season games dropped)"
    )
