from pathlib import Path
import pandas as pd

PROCESSED_DATA_DIR = Path(__file__).parent.parent / "data" / "processed"


def to_long_format(games: pd.DataFrame) -> pd.DataFrame:

    home = games[
        [
            "GAME_ID",
            "GAME_DATE",
            "home_team",
            "away_team",
            "home_pts",
            "home_reb",
            "home_ast",
            "home_win",
        ]
    ].copy()
    home = home.rename(
        columns={
            "home_team": "team",
            "away_team": "opponent",
            "home_pts": "pts",
            "home_reb": "reb",
            "home_ast": "ast",
            "home_win": "win",
        }
    )

    home["is_home"] = 1
    away = games[
        [
            "GAME_ID",
            "GAME_DATE",
            "away_team",
            "home_team",
            "away_pts",
            "away_reb",
            "away_ast",
            "home_win",
        ]
    ].copy()
    away = away.rename(
        columns={
            "away_team": "team",
            "home_team": "opponent",
            "away_pts": "pts",
            "away_reb": "reb",
            "away_ast": "ast",
        }
    )
    away["win"] = 1 - away["home_win"]
    away = away.drop(columns=["home_win"])
    away["is_home"] = 0

    long_df = pd.concat([home, away], ignore_index=True)
    return long_df.sort_values(["team", "GAME_DATE"]).reset_index(drop=True)


def add_rolling_form(long_df: pd.DataFrame, window: int = 5) -> pd.DataFrame:
    long_df = long_df.copy()
    grouped = long_df.groupby("team")

    for col in ["win", "pts", "reb", "ast"]:
        long_df[f"{col}_avg_last{window}"] = (
            grouped[col].shift(1).rolling(window).mean().reset_index(level=0, drop=True)
        )

    return long_df


def add_rest_days(long_df: pd.DataFrame) -> pd.DataFrame:
    long_df = long_df.copy()
    long_df["prev_game_date"] = long_df.groupby("team")["GAME_DATE"].shift(1)
    long_df["rest_days"] = (long_df["GAME_DATE"] - long_df["prev_game_date"]).dt.days

    return long_df.drop(columns=["prev_game_date"])


def build_feature_matrix(games: pd.DataFrame, window: int = 5) -> pd.DataFrame:
    long_df = to_long_format(games)
    long_df = add_rolling_form(long_df, window=window)
    long_df = add_rest_days(long_df)

    feature_cols = [
        f"win_avg_last{window}",
        f"pts_avg_last{window}",
        f"reb_avg_last{window}",
        f"ast_avg_last{window}",
        "rest_days",
    ]

    home_feats = long_df[long_df["is_home"] == 1][["GAME_ID"] + feature_cols]
    home_feats = home_feats.rename(columns={c: f"home_{c}" for c in feature_cols})

    away_feats = long_df[long_df["is_home"] == 0][["GAME_ID"] + feature_cols]
    away_feats = away_feats.rename(columns={c: f"away_{c}" for c in feature_cols})

    features = games[["GAME_ID", "GAME_DATE", "home_team", "away_team", "home_win"]]
    features = features.merge(home_feats, on="GAME_ID").merge(away_feats, on="GAME_ID")

    features = features.dropna()

    return features


if __name__ == "__main__":
    games = pd.read_csv(
        PROCESSED_DATA_DIR / "games_clean.csv", parse_dates=["GAME_DATE"]
    )
    feature_df = build_feature_matrix(games)
    feature_df.to_csv(PROCESSED_DATA_DIR / "features.csv", index=False)
    print(
        f"Saved {len(feature_df)} feature rows ({len(games) - len(feature_df)} early-season games dropped)"
    )
