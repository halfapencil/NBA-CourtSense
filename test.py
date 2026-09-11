import pandas as pd
from pipeline.db import write_games, write_predictions
from pipeline.predict import (
    predict_games,
    get_latest_team_form,
    build_upcoming_features,
)
from pathlib import Path
import joblib
from pipeline.fetch import fetch_upcoming_games

PROCESSED_DATA_DIR = Path(__file__).parent / "data" / "processed"
MODELS_DIR = Path(__file__).parent / "models"

games = pd.read_csv("data/processed/games_clean.csv", parse_dates=["GAME_DATE"])
write_games(games)

model = joblib.load(MODELS_DIR / "model.pkl")

team_form = get_latest_team_form(games)
date = "2026-01-15"
upcoming_games = fetch_upcoming_games(date)

upcoming_features = build_upcoming_features(upcoming_games, team_form)
predictions = predict_games(upcoming_features, model)

write_predictions(predictions)
