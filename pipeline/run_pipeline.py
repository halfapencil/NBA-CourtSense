from datetime import datetime
import joblib
from pathlib import Path
from .fetch import fetch_upcoming_games
from .clean import add_home_away, reshape_to_game_level
from .predict import get_latest_team_form, build_upcoming_features, predict_games
from .db import (
    write_predictions,
    read_games,
    write_games,
    update_prediction_outcome,
)
import time

MODELS_DIR = Path(__file__).parent.parent / "models"


def fetch_with_retry(fetch_fn, max_retries=3, delay=10):
    for attempt in range(max_retries):
        try:
            return fetch_fn()
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(10)
            else:
                raise


def update_completed_games(season: str = "2025-26"):
    from nba_api.stats.endpoints import leaguegamelog
    import pandas as pd

    game_log = fetch_with_retry(
        lambda: leaguegamelog.LeagueGameLog(
            season=season, season_type_all_star="Regular Season"
        )
    )

    raw = game_log.get_data_frames()[0]
    raw["GAME_DATE"] = pd.to_datetime(raw["GAME_DATE"])
    raw = add_home_away(raw)
    games = reshape_to_game_level(raw)
    write_games(games)


def run(date: str | None = None):
    target_date = date or datetime.today().strftime("%Y-%m-%d")

    print(f"Pipeline for {target_date}")
    update_completed_games()
    update_prediction_outcome()
    games = read_games()
    print(f"Loaded {len(games)} historical games from database")

    model = joblib.load(MODELS_DIR / "model.pkl")
    spread_model = joblib.load(MODELS_DIR / "spread_model.pkl")
    team_form = get_latest_team_form(games, as_of_date=target_date)
    upcoming_games = fetch_upcoming_games(target_date)

    if upcoming_games.empty:
        print(f"No games for {target_date}, No predictions available")
        return
    upcoming_features = build_upcoming_features(upcoming_games, team_form)
    predictions = predict_games(upcoming_features, model, spread_model)
    if predictions.empty:
        print(f"No predictions for {target_date}")
        return
    write_predictions(predictions)
    print(f"Wrote {len(predictions)} to database for {target_date}")


if __name__ == "__main__":
    run()
