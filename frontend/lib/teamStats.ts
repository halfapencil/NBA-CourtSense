import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { accessedDynamicData } from "next/dist/server/app-render/dynamic-rendering";
import { accumulateMetadata } from "next/dist/lib/metadata/resolve-metadata";

// All stats to be shown
export const STAT_COLS = ['pts', 'oreb', 'dreb', 'reb', 'ast', 'stl', 'blk', 'tov', 'pf', 'fgm', 'fga', 'fg3m', 'fg3a', 'ftm', 'fta']
//All nba team abbreviations, to be updated when expansion occurs
export const NBA_TEAMS = [
    'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
    'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
    'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS',
]

export const SHARE_STATS = ['pts', 'reb', 'ast', 'stl', 'blk', 'tov']
export type ShareStat = (typeof SHARE_STATS)[number]
export type ShareKey = 'min' | ShareStat | 'usg'
// Aggregating team stats
type TeamGameRow = {
    game_id: string
    game_date: string
    home_team: string
    away_team: string
    home_win: number
    [key: string]: any
}

export type PlayerStatShare = {
    playerId: string
    name: string
    gp: number
    minutes: number
    shares: Record<string, number>
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

    let homeWin = 0
    let homeLoss = 0
    let awayWin = 0
    let awayLoss = 0

    const totals: Record<string, number> = {}
    const oppTotals: Record<string, number> = {}
    STAT_COLS.forEach((c) => { totals[c] = 0; oppTotals[c] = 0 })

    for (const g of games) {
        const isHome = g.home_team === team
        const won = isHome ? g.home_win === 1 : g.home_win === 0
        if (won) {
            wins++
            if (isHome) homeWin++
            else awayWin++
        }
        else {
            losses++
            if (isHome) homeLoss++
            else awayLoss++
        }

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
        homeWin,
        homeLoss,
        awayWin,
        awayLoss,
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

// Get two teams total stats head to head
export async function getHeadToHead(teamA: string, teamB: string, season: string) {
    const { start, end } = seasonDateRange(season)
    const { data, error } = await supabase
        .from('games')
        .select("*")
        .or(
            `and(home_team.eq.${teamA},away_team.eq.${teamB}),and(home_team.eq.${teamB},away_team.eq.${teamA})`
        )
        .gte('game_date', start)
        .lte('game_date', end)
        .order('game_date', { ascending: false })

    if (error) {
        console.error(error)
        return []
    }
    return data ?? []
}

// Get two teams players stats for comparison
export async function getHeadToHeadPlayerStats(
    teamA: string,
    teamB: string,
    season: string
) {
    const games = await getHeadToHead(teamA, teamB, season)
    if (games.length === 0) return { games: [], playersA: [], playersB: [] }

    const gameId = games.map((g) => g.game_id)
    const { data, error } = await supabase
        .from('player_games')
        .select("*")
        .in('game_id', gameId)

    if (error || !data) {
        console.error('getHeadToHeadPlayerStats error', error)
        return { games, playersA: [], playersB: [] }
    }
    const byPlayers = new Map<number, { player_name: string; team: string; games: number; totals: Record<string, number> }>()

    for (const row of data) {
        if (!byPlayers.has(row.player_id)) {
            byPlayers.set(row.player_id, {
                player_name: row.player_name,
                team: row.team,
                games: 0,
                totals: Object.fromEntries(STAT_COLS.map((c) => [c, 0]))
            })
        }
        const entry = byPlayers.get(row.player_id)!
        entry.games += 1
        for (const col of STAT_COLS) {
            entry.totals[col] += row[col] ?? 0
        }
    }

    const allPlayers = Array.from(byPlayers.entries()).map(([player_id, p]) => ({
        player_id,
        player_name: p.player_name,
        team: p.team,
        gamesPlayed: p.games,
        averages: Object.fromEntries(STAT_COLS.map((c) => [c, p.totals[c] / p.games]))
    }))
    return {
        games,
        playersA: allPlayers.filter((p) => p.team === teamA).sort((a, b) => {
            if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed
            return b.averages.pts - a.averages.pts
        }),
        playersB: allPlayers.filter((p) => p.team === teamB).sort((a, b) => {
            if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed
            return b.averages.pts - a.averages.pts
        })

    }
}
export async function getTeamStatShare(team: string, season: string) {
    const { start, end } = seasonDateRange(season)
    const { data: game_data, error: game_error } = await supabase
        .from('games')
        .select("game_id")
        .or(`home_team.eq.${team},away_team.eq.${team}`)
        .gte('game_date', start)
        .lte('game_date', end)

    if (game_error) throw new Error(`getTeamStatShare games: ${game_error.message}`)

    const gameIds = (game_data ?? []).map((g) => String(g.game_id))
    if (gameIds.length === 0) return { players: [] as PlayerStatShare[], teamGames: 0, gamesWithBoxScores: 0 }

    const PAGE = 1000
    const playerRows: any[] = []
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
            .from('player_games')
            .select("*")
            .in('game_id', gameIds)
            .eq('team', team)
            .order('game_id', { ascending: true })
            .order('player_id', { ascending: true })
            .range(from, from + PAGE - 1)
        if (error) throw new Error(`getTeamStatShare player_games: ${error.message}`)
        if (!data || data.length === 0) break
        playerRows.push(...data)
        if (data.length < PAGE) break
    }

    const playedRows = playerRows.filter((r) => r.min !== null && r.min !== undefined)
    const ACCUM = [...SHARE_STATS, 'fga', 'fta']
    const zero = () => {
        const t: Record<string, number> = { min: 0 }
        for (const stat of ACCUM) t[stat] = 0
        return t
    }


    const teamByGame = new Map<string, Record<string, number>>()
    for (const row of playedRows) {
        const gid = String(row.game_id)
        if (!teamByGame.has(gid)) teamByGame.set(gid, zero())
        const t = teamByGame.get(gid)!
        t.min += Number(row.min) || 0
        for (const stat of ACCUM) t[stat] += Number(row[stat]) || 0
    }

    const byPlayers = new Map<string, {
        name: string
        gp: number
        minutes: number
        totals: Record<string, number>
        teamTotals: Record<string, number>
    }>()
    const gamesSeen = new Set<string>()

    for (const row of playedRows) {
        const gid = String(row.game_id)
        const id = String(row.player_id)
        const minutes = Number(row.min) || 0
        gamesSeen.add(gid)

        if (!byPlayers.has(id)) {
            byPlayers.set(id, {
                name: row.player_name ?? id,
                gp: 0,
                minutes: 0,
                totals: zero(),
                teamTotals: zero(),
            })
        }
        const entry = byPlayers.get(id)!
        const teamGame = teamByGame.get(gid)!
        entry.gp += 1
        entry.minutes += minutes
        entry.teamTotals.min += teamGame.min

        for (const stat of ACCUM) {
            entry.totals[stat] += Number(row[stat]) || 0
            entry.teamTotals[stat] += teamGame[stat]
        }
    }

    const usage = (fga: number, fta: number, tov: number) => fga + 0.44 * fta + tov
    const share = (part: number, total: number) => (total > 0 ? part / total : 0)

    const players: PlayerStatShare[] = []
    for (const [playerId, p] of byPlayers) {
        const shares = {} as Record<ShareKey, number>
        shares.min = share(p.minutes, p.teamTotals.min)
        for (const stat of SHARE_STATS) {
            shares[stat] = share(p.totals[stat], p.teamTotals[stat])
        }
        shares.usg = share(
            usage(p.totals.fga, p.totals.fta, p.totals.tov),
            usage(p.teamTotals.fga, p.teamTotals.fta, p.teamTotals.tov)
        )
        players.push({ playerId, name: p.name, gp: p.gp, minutes: p.minutes, shares })
    }
    players.sort((a, b) => b.minutes - a.minutes)
    return { players, teamGames: gameIds.length, gamesWithBoxScores: gamesSeen.size }

}