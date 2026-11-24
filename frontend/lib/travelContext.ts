import { supabase } from "./supabase"
import { distanceMiles, isCanadian } from "./teamLocations"
import { daysBetween } from "./teamStats"

export type TeamTravel = {
    restDays: number | null     // days off since the last game (null if none found)
    travelMiles: number | null  // last game's arena to today's arena
    from: string | null         // home team of the last game, i.e. where they were
    crossedBorder: boolean
}

const EMPTY: TeamTravel = { restDays: null, travelMiles: null, from: null, crossedBorder: false }
const LOOKBACK_DAYS = 14

// For every team playing on `date`, how rested they are and how far they travelled.
// Assumes each game is played in the home team's arena.
export async function getTravelContext(
    date: string,
    matchups: { home_team: string; away_team: string }[]
): Promise<Record<string, TeamTravel>> {
    if (!matchups.length) return {}

    const since = new Date(Date.parse(date) - LOOKBACK_DAYS * 86400000).toISOString().slice(0, 10)

    // One query for every game in the lookback window (about 100 rows)
    const { data, error } = await supabase
        .from('games')
        .select('game_date, home_team, away_team')
        .gte('game_date', since)
        .lt('game_date', date)
        .order('game_date', { ascending: false })
    if (error) {
        console.error('getTravelContext', error.message)
        return {}
    }

    // Rows are newest first, so the first time we see a team is its last game
    const lastGame = new Map<string, { date: string; venue: string }>()
    for (const g of data ?? []) {
        for (const team of [g.home_team, g.away_team]) {
            if (!lastGame.has(team)) lastGame.set(team, { date: g.game_date, venue: g.home_team })
        }
    }

    const result: Record<string, TeamTravel> = {}
    for (const m of matchups) {
        for (const team of [m.home_team, m.away_team]) {
            const last = lastGame.get(team)
            result[team] = last
                ? {
                    restDays: daysBetween(last.date, date) - 1,
                    travelMiles: distanceMiles(last.venue, m.home_team),
                    from: last.venue,
                    crossedBorder: isCanadian(last.venue) !== isCanadian(m.home_team),
                }
                : EMPTY
        }
    }
    return result
}
