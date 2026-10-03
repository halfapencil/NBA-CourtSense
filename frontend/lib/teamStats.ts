import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// All stats to be shown
export const STAT_COLS = ['pts', 'oreb', 'dreb', 'reb', 'ast', 'stl', 'blk', 'tov', 'pf', 'fgm', 'fga', 'fg3m', 'fg3a', 'ftm', 'fta']
//All nba team abbreviations, to be updated when expansion occurs
export const NBA_TEAMS = [
    'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
    'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
    'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS',
]

// Aggregating team stats
type TeamGameRow = {
    game_id: string
    game_date: string
    home_team: string
    away_team: string
    home_win: number
    [key: string]: any
}

// type for getting all games from a single team
export type TeamGameLogRow = {
    game_id: string
    game_date: string
    opponent: string
    is_home: boolean
    win: boolean
    restDays: number | null
    [key: string]: any
}

export function seasonForDate(date: Date): string {
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()
    const startYear = month >= 10 ? year : year - 1

    return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

export function seasonDateRange(season: string): { start: string; end: string } {
    const [startYear] = season.split('-')
    const start = `${startYear}-10-01`
    const end = `${Number(startYear) + 1}-09-30`

    return { start, end }
}



//GET all games for a team through a season
export async function getTeamSeasonStats(
    team: string,
    season: string,
    asOfDate?: string
) {
    const { start, end } = seasonDateRange(season)
    const effectiveEnd = asOfDate && asOfDate < end ? asOfDate : end
    const { data, error } = await supabase
        .from('games')
        .select("*")
        .or(`home_team.eq.${team},away_team.eq.${team}`)
        .gte('game_date', start)
        .lte('game_date', effectiveEnd)
        .order('game_date', { ascending: true })
    if (error) {
        console.error(error)
        return null
    }
    if (!data || data.length === 0) return null
    return aggregateTeamStats(team, data as TeamGameRow[])
}

// Given a team and the games they have played, returns the selected team's average and the average stats their opponents get.
function aggregateTeamStats(team: string, games: TeamGameRow[]) {
    let wins = 0
    let losses = 0

    const totals: Record<string, number> = {}
    const oppTotals: Record<string, number> = {}
    STAT_COLS.forEach((c) => { totals[c] = 0; oppTotals[c] = 0 })

    for (const g of games) {
        const isHome = g.home_team === team
        const won = isHome ? g.home_win === 1 : g.home_win === 0
        if (won) wins++
        else losses++

        for (const col of STAT_COLS) {
            totals[col] += isHome ? g[`home_${col}`] ?? 0 : g[`away_${col}`] ?? 0
            oppTotals[col] += isHome ? g[`away_${col}`] ?? 0 : g[`home_${col}`] ?? 0
        }
    }
    const n = games.length
    const averages: Record<string, number> = {}
    const oppAverages: Record<string, number> = {}

    for (const col of STAT_COLS) {
        averages[col] = totals[col] / n
        oppAverages[col] = oppTotals[col] / n
    }

    return {
        team,
        gamesPlayed: n,
        wins,
        losses,
        averages,
        oppAverages,
        lastGameDate: games[games.length - 1].game_date
    }
}

// get all available seasons
export async function getAvailableSeasons(team: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('games')
        .select('game_date')
        .or(`home_team.eq.${team},away_team.eq.${team}`)
        .order('game_date', { ascending: true })
    if (error || !data) return []
    const seasons = new Set(data.map((g) => seasonForDate(new Date(g.game_date))))
    return Array.from(seasons).sort().reverse()
}

export async function getTeamGameLog(team: string, season: string): Promise<TeamGameLogRow[]> {
    const { start, end } = seasonDateRange(season)
    const { data, error } = await supabase
        .from('games')
        .select("*")
        .or(`home_team.eq.${team},away_team.eq.${team}`)
        .gte('game_date', start)
        .lte('game_date', end)
        .order('game_date', { ascending: true })
    if (error) {
        console.error(error)
        return []
    }
    if (!data) return []

    return data.map((g, i, arr) => {
        const isHome = g.home_team === team
        const won = isHome ? g.home_win === 1 : g.home_win === 0
        let restDays: number | null = null
        if (i > 0) {
            const prevDate = new Date(arr[i - 1].game_date)
            const currDate = new Date(g.game_date)
            const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000)
            restDays = diffDays - 1 // days OFF between games, not days between game dates
        } else {
            restDays = null
        }
        const row: TeamGameLogRow = {
            game_id: g.game_id,
            game_date: g.game_date,
            opponent: isHome ? g.away_team : g.home_team,
            is_home: isHome,
            win: won,
            restDays
        }
        for (const col of STAT_COLS) {
            row[col] = isHome ? g[`home_${col}`] : g[`away_${col}`]
            row[`opp_${col}`] = isHome ? g[`away_${col}`] : g[`home_${col}`]
        }
        return row
    })
}