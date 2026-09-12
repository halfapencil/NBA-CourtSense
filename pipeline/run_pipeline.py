from datetime import datetime
import joblib
from pathlib import Path
from .fetch import fetch_upcoming_games
from .predict import get_latest_team_form, build_upcoming_features, predict_games
from .db import write_predictions, read_games

MODELS_DIR = Path(__file__).parent.parent / "models"


def run(date: str | None = None):
    target_date = date or datetime.today().strftime("%Y-%m-%d")

    print(f"Pipeline for {target_date}")
    games = read_games()
    print(f"Loaded {len(games)} historical games from database")

    model = joblib.load(MODELS_DIR / "model.pkl")

    team_form = get_latest_team_form(games, as_of_date=target_date)
    upcoming_games = fetch_upcoming_games(target_date)
    print(team_form[["team", "last_game_date"]].to_string())

    if upcoming_games.empty:
        print(f"No games for {target_date}, No predictions available")
        return

    upcoming_features = build_upcoming_features(upcoming_games, team_form)
    predictions = predict_games(upcoming_features, model)
    print("Loading model from:", MODELS_DIR / "model.pkl")
    print("Model coefficients:", model.coef_)
    print("Number of features model expects:", model.coef_.shape[1])
    write_predictions(predictions)
    print(predictions)
    print(f"Wrote {len(predictions)} to database for {target_date}")


if __name__ == "__main__":
    run()
