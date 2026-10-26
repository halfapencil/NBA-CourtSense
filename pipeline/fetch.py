from nba_api.stats.endpoints import (
    leaguegamelog,
    scoreboardv3,
    boxscoretraditionalv3,
    commonallplayers,
    scheduleleaguev2,
)
from nba_api.stats.static import teams
from pathlib import Path
import pandas as pd
import time

RAW_DATA_DIR = Path(__file__).parent.parent / "data" / "raw"
PLAYER_COLS = ["player_id", "player_name", "current_team"]
PLAYER_BOX_SCORE_RENAME = {
    "gameId": "game_id",
    "personId": "player_id",
    "teamTricode": "team",
    "position": "position",
    "comment": "comment",
    "points": "pts",
    "reboundsOffensive": "oreb",
    "reboundsDefensive": "dreb",
    "reboundsTotal": "reb",
    "assists": "ast",
    "steals": "stl",
    "blocks": "blk",
    "turnovers": "tov",
    "foulsPersonal": "pf",
    "fieldGoalsMade": "fgm",
    "fieldGoalsAttempted": "fga",
    "threePointersMade": "fg3m",
    "threePointersAttempted": "fg3a",
    "freeThrowsMade": "ftm",
    "freeThrowsAttempted": "fta",
    "plusMinusPoints": "plus_minus",
}

SCHEDULE_COLS = {
    "gameId": "game_id",
    "gameDateTimeUTC": "tipoff_utc",
    "homeTeam_teamId": "home_team_id",
    "awayTeam_teamId": "away_team_id",
    "arenaName": "arena_name",
    "arenaCity": "arena_city",
}


def fetch_schedule(season: str) -> pd.DataFrame:
    # Fetch scheduled start times (and venue) for every game in a season
    sched = scheduleleaguev2.ScheduleLeagueV2(season=season)
    df = sched.get_data_frames()[0]
    df = df.rename(columns=SCHEDULE_COLS)
    df["tipoff_utc"] = pd.to_datetime(df["tipoff_utc"], utc=True)
    return df[list(SCHEDULE_COLS.values())]


def fetch_multiple_schedules(seasons: list[str]) -> pd.DataFrame:
    all_sched = []
    for season in seasons:
        print(f"Fetching schedule {season}...")
        all_sched.append(fetch_schedule(season))
        time.sleep(1)
    return pd.concat(all_sched, ignore_index=True)


def fetch_tipoff_for_date(date: str) -> pd.DataFrame:
    sb = scoreboardv3.ScoreboardV3(game_date=date)
    games = sb.get_dict()["scoreboard"]["games"]
    return pd.DataFrame(
        [
            {
                "game_id": g["gameId"],
                "tipoff_utc": pd.to_datetime(g["gameTimeUTC"], utc=True),
            }
            for g in games
        ]
    )


def fetch_player_box_score(game_id: str) -> pd.DataFrame:
    box = boxscoretraditionalv3.BoxScoreTraditionalV3(game_id=game_id)
    df = box.player_stats.get_data_frame()
    if df.empty:
        return pd.DataFrame(
            columns=list(PLAYER_BOX_SCORE_RENAME.values()) + ["min", "player_name"]
        )

    df["player_name"] = df["firstName"] + " " + df["familyName"]

    def parse_minutes(m):
        if not m or pd.isna(m):
            return None
        parts = str(m).split(":")
        if len(parts) != 2:
            return None
        mins, secs = parts
        return round(int(mins) + int(secs) / 60, 1)

    df["min"] = df["minutes"].apply(parse_minutes)
    df = df.rename(columns=PLAYER_BOX_SCORE_RENAME)
    keep_cols = list(PLAYER_BOX_SCORE_RENAME.values()) + ["min", "player_name"]

    return df[keep_cols]


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


# get all players from season parameter
def fetch_current_players(season: str = "2025-26") -> pd.DataFrame:
    resp = commonallplayers.CommonAllPlayers(is_only_current_season=1, season=season)
    df = resp.get_data_frames()[0]
    print(df.columns)
    out = df.rename(
        columns={
            "PERSON_ID": "player_id",
            "DISPLAY_FIRST_LAST": "player_name",
            "TEAM_ABBREVIATION": "current_team",
        }
    )
    return out[["player_id", "player_name", "current_team"]]


# save all games from seasons to a csv
if __name__ == "__main__":
    seasons = ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26", "2026-27"]
    # sched_df = fetch_multiple_schedules(seasons)
    # sched_df.to_csv(RAW_DATA_DIR / "nba_schedule_raw.csv", index=False)
    games_df = fetch_multiple_seasons(seasons)
    games_df.to_csv(RAW_DATA_DIR / "nba_games_raw.csv", index=False)
    print(games_df.columns)
    print(f"Saved {len(games_df)} rows")
    # fetch_current_players()
