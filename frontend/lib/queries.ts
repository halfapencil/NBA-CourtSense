import { supabase } from "./supabase"

export type CompletedGames = {
    game_date: string
    home_team: string
    away_team: string
    home_win_prob: number
    actual_home_win: number
}

type Matchup = { date: string; home: string; away: string }

// Date math in UTC so the result never shifts across a DST change or timezone
function shiftDate(date: string, deltaDays: number): string {
    const d = new Date(date)
    d.setUTCDate(d.getUTCDate() + deltaDays)
    return d.toISOString().slice(0, 10)
}

// Returns completed predictions grouped by date, newest first, for `days`
// calendar days ending on (and including) startDate.
export async function getRecentGamesByDate(startDate: string, days = 5) {
    const { data, error } = await supabase
        .from('predictions')
        .select('game_date, home_team, away_team, home_win_prob, actual_home_win')
        .not('actual_home_win', 'is', null)
        .lte('game_date', shiftDate(startDate, 0))
        .gte('game_date', shiftDate(startDate, -(days - 1)))
        .order('game_date', { ascending: false })

    if (error) {
        console.error("Error getting completed games", error)
        return []
    }

    // Rows arrive newest first and a Map keeps insertion order, so no re-sort is needed
    const byDate = new Map<string, CompletedGames[]>()
    for (const game of data ?? []) {
        if (!byDate.has(game.game_date)) byDate.set(game.game_date, [])
        byDate.get(game.game_date)!.push(game)
    }
    return Array.from(byDate.entries())
}

// One row from `table` for a given date, home team and away team
async function findByMatchup(table: 'games' | 'predictions', { date, home, away }: Matchup) {
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('game_date', date)
        .eq('home_team', home)
        .eq('away_team', away)
        .maybeSingle()
    if (error) {
        console.error(`findByMatchup(${table})`, error)
        return null
    }
    return data
}

// Given date, home team and away team, returns the game row from games table
export function getGame({ date, away, home }: Matchup) {
    return findByMatchup('games', { date, home, away })
}

// Given home team, away team and date, returns the model's prediction row
export function getGamePredictions(home: string, away: string, date: string) {
    return findByMatchup('predictions', { date, home, away })
}

// Given gameId, returns the box score, highest scorers first
export async function getPlayerBoxScore(gameId: string) {
    const { data, error } = await supabase
        .from('player_games')
        .select("*")
        .eq('game_id', gameId)
        .order('pts', { ascending: false, nullsFirst: false })

    if (error) {
        console.error(error)
        return []
    }
    return data
}