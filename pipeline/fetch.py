from nba_api.stats.endpoints import leaguegamelog, scoreboardv3
from nba_api.stats.static import teams
from pathlib import Path
import pandas as pd
import time

RAW_DATA_DIR = Path(__file__).parent.parent / "data" / "raw"


def fetch_season(season: str) -> pd.DataFrame:
    # Fetch a single season
    gamelog = leaguegamelog.LeagueGameLog(
        season=season, season_type_all_star="Regular Season"
    )
    return gamelog.get_data_frames()[0]


def fetch_multiple_seasons(seasons: list[str]) -> pd.DataFrame:
    # Given a list of seasons, fetch all seasons
    all_games = []
    for season in seasons:
        print(f"Fetching {season}...")
        df = fetch_season(season)
        all_games.append(df)
        time.sleep(1)
    return pd.concat(all_games, ignore_index=True)


def fetch_upcoming_games(game_date: str) -> pd.DataFrame:
    # Retrieves games for game_date
    try:
        sb = scoreboardv3.ScoreboardV3(game_date=game_date)
        raw = sb.get_dict()
        games = raw["scoreboard"]["games"]
    except Exception as e:
        print(f"Could not fetch schedule for {game_date}: {e}")
        return pd.DataFrame(columns=["game_date", "home_team", "away_team"])

    if not games:
        return pd.DataFrame(columns=["game_date", "home_team", "away_team"])

    rows = [
        {
            "game_date": pd.to_datetime(game_date),
            "home_team": game["homeTeam"]["teamTricode"],
            "away_team": game["awayTeam"]["teamTricode"],
        }
        for game in games
    ]
    return pd.DataFrame(rows)


if __name__ == "__main__":
    seasons = ["2021-22", "2022-23", "2023-24", "2024-25"]
    games_df = fetch_multiple_seasons(seasons)
    games_df.to_csv(RAW_DATA_DIR / "nba_games_raw.csv", index=False)
    print(games_df.columns)
    print(f"Saved {len(games_df)} rows")
