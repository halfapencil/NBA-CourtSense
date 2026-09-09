from nba_api.stats.endpoints import leaguegamelog, scoreboardv2
from pathlib import Path
import pandas as pd
import time

RAW_DATA_DIR = Path(__file__).parent.parent / "data" / "raw"

def fetch_season(season:str) -> pd.DataFrame:
    #Fetch a single season
    gamelog = leaguegamelog.LeagueGameLog(
        season=season,
        season_type_all_star='Regular Season'
    )
    return gamelog.get_data_frames()[0]

def fetch_multiple_seasons(seasons: list[str]) -> pd.DataFrame:
    #Given a list of seasons, fetch all seasons
    all_games = []
    for season in seasons:
        print(f"Fetching {season}...")
        df = fetch_season(season)
        all_games.append(df)
        time.sleep(1)
    return pd.concat(all_games, ignore_index= True)

if __name__ == "__main__":
    seasons = ['2021-22', '2022-23', '2023-24', '2024-25']
    games_df = fetch_multiple_seasons(seasons)
    games_df.to_csv(RAW_DATA_DIR / 'nba_games_raw.csv', index=False)
    print(f"Saved {len(games_df)} rows")