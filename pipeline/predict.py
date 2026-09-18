from pathlib import Path
import pandas as pd
import joblib
from datetime import datetime
from .features import to_long_format, add_rolling_form
from .fetch import fetch_upcoming_games
from .constants import WIN_MODEL_STATS
from scipy.stats import norm

PROCESSED_DATA_DIR = Path(__file__).parent.parent / "data" / "processed"
MODELS_DIR = Path(__file__).parent.parent / "models"

WINDOW = 5
FEATURE_COLS = [f"{c}_avg_last{WINDOW}" for c in ["win"] + WIN_MODEL_STATS] + [
    "rest_days",
]


def get_features():
    return FEATURE_COLS


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

    df["home_rest_days"] = (df["game_date"] - df["home_last_game_date"]).dt.days
    df["away_rest_days"] = (df["game_date"] - df["away_last_game_date"]).dt.days
    return df

def implied_spread(home_win_prob: float, std_dev: float = 12.0) -> float:
    z = norm.ppf(home_win_prob)
    return round(z * std_dev, 1)


def predict_games(upcoming_features: pd.DataFrame, model) -> pd.DataFrame:
    features_cols = [f"home_{c}" for c in FEATURE_COLS] + [
        f"away_{c}" for c in FEATURE_COLS
    ]

    before = len(upcoming_features)
    upcoming_features = upcoming_features.dropna(subset=features_cols)
    if len(upcoming_features) < before:
        print(
            f"Dropped {before - len(upcoming_features)} games due to insufficient team history"
        )

    X = upcoming_features[features_cols]
    upcoming_features = upcoming_features.copy()
    upcoming_features["home_win_prob"] = model.predict_proba(X)[:, 1]
    upcoming_features["home_spread"] = upcoming_features["home_win_prob"].apply(
        implied_spread
    )
    return upcoming_features[
        [
            "game_date",
            "home_team",
            "away_team",
            "home_win_prob",
            "home_win_avg_last5",
            "home_pts_avg_last5",
            "home_rest_days",
            "away_win_avg_last5",
            "away_pts_avg_last5",
            "away_rest_days",
            "home_spread",
        ]
    ]


if __name__ == "__main__":
    games = pd.read_csv(
        PROCESSED_DATA_DIR / "games_clean.csv", parse_dates=["game_date"]
    )
    model = joblib.load(MODELS_DIR / "model.pkl")

    today = datetime.today().strftime("%Y-%m-%d")
    date = "2025-01-15"
    team_form = get_latest_team_form(games, date)

    upcoming_games = fetch_upcoming_games(date)
    long_df = to_long_format(games)
    long_df = long_df[long_df["game_date"] < pd.Timestamp("2025-01-15")]

    if upcoming_games.empty:
        print(f"No games for {date}")
    else:
        upcoming_features = build_upcoming_features(upcoming_games, team_form)
        predictions = predict_games(upcoming_features, model)
        print(predictions)
