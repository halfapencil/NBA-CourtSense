from nba_api.stats.endpoints import leaguegamelog, scoreboardv2
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
    scoreboard = scoreboardv2.ScoreboardV2(game_date=game_date)
    games_df = scoreboard.get_data_frames()[0]
    team_lookup = {t["id"]: t["abbreviation"] for t in teams.get_teams()}
    result = pd.DataFrame(
        {
            "game_date": pd.to_datetime(games_df["GAME_DATE_EST"]),
            "home_team": games_df["HOME_TEAM_ID"].map(team_lookup),
            "away_team": games_df["VISITOR_TEAM_ID"].map(team_lookup),
        }
    )
    return result


if __name__ == "__main__":
    seasons = ["2021-22", "2022-23", "2023-24", "2024-25"]
    games_df = fetch_multiple_seasons(seasons)
    games_df.to_csv(RAW_DATA_DIR / "nba_games_raw.csv", index=False)
    print(games_df.columns)
    print(f"Saved {len(games_df)} rows")
