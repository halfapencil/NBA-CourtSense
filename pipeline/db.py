import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import pandas as pd

load_dotenv(Path(__file__).parent.parent / ".env")
DATABASE_URL = os.environ["DATABASE_URL"]


def get_engine():
    return create_engine(DATABASE_URL)


def write_games(games_df: pd.DataFrame):

    engine = get_engine()
    rename_map = {
        "GAME_ID": "game_id",
        "GAME_DATE": "game_date",
        "home_team": "home_team",
        "away_team": "away_team",
        "home_pts": "home_pts",
        "away_pts": "away_pts",
        "home_reb": "home_reb",
        "away_reb": "away_reb",
        "home_ast": "home_ast",
        "away_ast": "away_ast",
        "home_win": "home_win",
    }

    df = games_df.rename(columns=rename_map)[list(rename_map.values())]
    df.to_sql("games_staging", engine, if_exists="replace", index=False)

    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO games SELECT * FROM games_staging 
            ON CONFLICT (game_id) DO NOTHING
    """))
        conn.execute(text("DROP TABLE games_staging"))

    print(f"Wrote {len(df)} into database")


def write_predictions(predictions_df: pd.DataFrame):
    engine = get_engine()
    df = predictions_df.rename(columns={"GAME_DATE": "game_date"})
    df.to_sql("predictions_staging", engine, if_exists="replace", index=False)

    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO predictions (game_date, home_team, away_team, home_win_prob)
            SELECT game_date, home_team, away_team, home_win_prob FROM predictions_staging
            ON CONFLICT (game_date, home_team, away_team) DO UPDATE
            SET home_win_prob = EXCLUDED.home_win_prob, predicted_at = NOW()
        """))
        conn.execute(text("DROP TABLE predictions_staging"))

    print(f"Wrote {len(df)} predictions to database")


def read_games() -> pd.DataFrame:
    engine = get_engine()
    return pd.read_sql("SELECT * FROM games", engine, parse_dates=["game_date"])
