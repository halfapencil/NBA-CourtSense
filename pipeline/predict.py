from pathlib import Path
import pandas as pd
import joblib
from datetime import datetime
from .features import to_long_format, add_rolling_form
from .fetch import fetch_upcoming_games
from .constants import WIN_MODEL_STATS

PROCESSED_DATA_DIR = Path(__file__).parent.parent / "data" / "processed"
MODELS_DIR = Path(__file__).parent.parent / "models"

WINDOW = 5
FEATURE_COLS = [f"{c}_avg_last{WINDOW}" for c in ["win"] + WIN_MODEL_STATS] + [
    "rest_days"
]


def get_latest_team_form(
    games: pd.DataFrame, as_of_date: str | None = None
) -> pd.DataFrame:
    long_df = to_long_format(games)

    if as_of_date is not None:
        long_df = long_df[long_df["game_date"] < pd.Timestamp(as_of_date)]

    long_df = add_rolling_form(long_df)

    latest = long_df.sort_values("game_date").groupby("team").tail(1)
    latest = latest[
        ["team", "game_date"]
        + [f"{c}_avg_last{WINDOW}" for c in ["win"] + WIN_MODEL_STATS]
    ]
    latest = latest.rename(columns={"game_date": "last_game_date"})
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
    print(df.columns.tolist())
    df["home_rest_days"] = (df["game_date"] - df["home_last_game_date"]).dt.days
    df["away_rest_days"] = (df["game_date"] - df["away_last_game_date"]).dt.days
    return df


def predict_games(upcoming_features: pd.DataFrame, model) -> pd.DataFrame:
    features_cols = [f"home_{c}" for c in FEATURE_COLS] + [f"away_{c}" for c in FEATURE_COLS]

    before = len(upcoming_features)
    upcoming_features = upcoming_features.dropna(subset=features_cols)
    if len(upcoming_features) < before:
        print(f"Dropped {before - len(upcoming_features)} games due to insufficient team history")

    X = upcoming_features[features_cols]
    upcoming_features = upcoming_features.copy()
    upcoming_features["home_win_prob"] = model.predict_proba(X)[:, 1]
    return upcoming_features[["game_date", "home_team", "away_team", "home_win_prob"]]

if __name__ == "__main__":
    games = pd.read_csv(
        PROCESSED_DATA_DIR / "games_clean.csv", parse_dates=["game_date"]
    )
    model = joblib.load(MODELS_DIR / "model.pkl")

    print(games["home_team"].unique())
    print(games["away_team"].unique())
    today = datetime.today().strftime("%Y-%m-%d")
    date = "2025-01-15"
    team_form = get_latest_team_form(games, date)
    print(team_form[team_form.isna().any(axis=1)])

    upcoming_games = fetch_upcoming_games(date)
    long_df = to_long_format(games)
    long_df = long_df[long_df["game_date"] < pd.Timestamp("2025-01-15")]
    print(long_df[long_df["team"] == "LAL"].groupby("team").size())
    print(long_df[long_df["team"].isin(["UTA", "SAS", "TOR", "WAS"])].groupby("team").size())
    print("Loading model from:", MODELS_DIR / "model.pkl")
    print("Model coefficients:", model.coef_)
    print("Number of features model expects:", model.coef_.shape[1])

    if upcoming_games.empty:
        print(f"No games for {date}")
    else:
        upcoming_features = build_upcoming_features(upcoming_games, team_form)
        predictions = predict_games(upcoming_features, model)
        print(predictions)
