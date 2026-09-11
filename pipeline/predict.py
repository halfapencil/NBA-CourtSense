from pathlib import Path
import pandas as pd
import joblib
from datetime import datetime
from .features import to_long_format, add_rolling_form
from .fetch import fetch_upcoming_games

PROCESSED_DATA_DIR = Path(__file__).parent.parent / "data" / "processed"
MODELS_DIR = Path(__file__).parent.parent / "models"

WINDOW = 5
FEATURE_COLS = [
    "win_avg_last5",
    "pts_avg_last5",
    "reb_avg_last5",
    "ast_avg_last5",
    "rest_days",
]


def get_latest_team_form(games: pd.DataFrame) -> pd.DataFrame:

    long_df = to_long_format(games)
    long_df = add_rolling_form(long_df)

    latest = long_df.sort_values("GAME_DATE").groupby("team").tail(1)
    latest = latest[
        ["team", "GAME_DATE"]
        + [f"{c}_avg_last{WINDOW}" for c in ["win", "pts", "reb", "ast"]]
    ]

    latest = latest.rename(columns={"GAME_DATE": "last_game_date"})
    return latest


def build_upcoming_features(
    upcoming_games: pd.DataFrame, team_form: pd.DataFrame
) -> pd.DataFrame:
    df = upcoming_games.copy()

    df = df.merge(
        team_form.add_prefix("home_"), left_on="home_team", right_on="home_team"
    )
    df = df.merge(
        team_form.add_prefix("away_"), left_on="away_team", right_on="away_team"
    )

    df["home_rest_days"] = (df["GAME_DATE"] - df["home_last_game_date"]).dt.days
    df["away_rest_days"] = (df["GAME_DATE"] - df["away_last_game_date"]).dt.days
    return df


def predict_games(upcoming_features: pd.DataFrame, model) -> pd.DataFrame:
    features_cols = [f"home_{c}" for c in FEATURE_COLS] + [
        f"away_{c}" for c in FEATURE_COLS
    ]

    X = upcoming_features[features_cols]

    upcoming_features = upcoming_features.copy()
    upcoming_features["home_win_prob"] = model.predict_proba(X)[:, 1]

    return upcoming_features[["GAME_DATE", "home_team", "away_team", "home_win_prob"]]


if __name__ == "__main__":
    games = pd.read_csv(
        PROCESSED_DATA_DIR / "games_clean.csv", parse_dates=["GAME_DATE"]
    )
    model = joblib.load(MODELS_DIR / "model.pkl")

    team_form = get_latest_team_form(games)
    today = datetime.today().strftime("%Y-%m-%d")
    date = "2026-01-15"
    upcoming_games = fetch_upcoming_games(date)

    if upcoming_games.empty:
        print(f"No games for {date}")
    else:
        upcoming_features = build_upcoming_features(upcoming_games, team_form)
        predictions = predict_games(upcoming_features, model)
        print(predictions)
