import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import pandas as pd
from .constants import BASE_STAT_COLS

load_dotenv(Path(__file__).parent.parent / ".env")
DATABASE_URL = os.environ["DATABASE_URL"]

rename_map = {
    "GAME_ID": "game_id",
    "GAME_DATE": "game_date",
    "home_team": "home_team",
    "away_team": "away_team",
    "home_win": "home_win",
}
for c in BASE_STAT_COLS:
    rename_map[f"home_{c}"] = f"home_{c}"
    rename_map[f"away_{c}"] = f"away_{c}"


def get_engine():
    return create_engine(DATABASE_URL)


def write_games(games_df: pd.DataFrame):
    engine = get_engine()

    df = games_df.rename(columns=rename_map)[list(rename_map.values())]
    df.to_sql("games_staging", engine, if_exists="replace", index=False)

    cols = list(rename_map.values())
    col_list = ", ".join(cols)
    update_cols = [c for c in cols if c != "game_id"]
    set_clause = ", ".join(f"{c} = EXCLUDED.{c}" for c in update_cols)

    with engine.begin() as conn:
        conn.execute(text(f"""
            INSERT INTO games ({col_list})
            SELECT {col_list} FROM games_staging
            ON CONFLICT (game_id) DO UPDATE SET {set_clause}
        """))
        conn.execute(text("DROP TABLE games_staging"))

    print(f"Wrote {len(df)} games to database")


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


def update_prediction_outcome():
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text("""
        UPDATE predictions p
        SET actual_home_win = g.home_win
        FROM games g
        WHERE p.home_team = g.home_team
        AND p.away_team = g.away_team
        AND p.game_date = g.game_date
        AND p.actual_home_win IS NULL
    """))
    print("Updated predictions for completed games")
