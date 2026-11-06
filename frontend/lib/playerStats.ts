import { supabase } from "./supabase";
import { seasonDateRange, STAT_COLS, fetchAll } from "./teamStats";

export type RosterPlayer = { player_id: number; player_name: string }

// player_games rows for one season. The date filter goes through the games join,
// so callers never need to look up game ids first.
function seasonPlayerGames(columns: string, season: string) {
    const { start, end } = seasonDateRange(season)
    return supabase
        .from('player_games')
        .select(`${columns}, games!inner(game_date)`)
        .gte('games.game_date', start)
        .lte('games.game_date', end)
}

export async function getTeamRoster(team: string, season: string): Promise<RosterPlayer[]> {
    try {
        // A team-season has over 1000 player rows, so this must be paged.
        // (player_id, game_id) is unique, which keeps page boundaries stable.
        const rows = await fetchAll((from, to) =>
            seasonPlayerGames('player_id, player_name', season)
                .eq('team', team)
                .order('player_id', { ascending: true })
                .order('game_id', { ascending: true })
                .range(from, to)
        )

        const names = new Map<number, string>()
        for (const r of rows) {
            if (!names.has(r.player_id)) names.set(r.player_id, r.player_name)
        }

        return [...names].map(([player_id, player_name]) => ({ player_id, player_name }))
            .sort((a, b) => (a.player_name ?? '').localeCompare(b.player_name ?? ''))
    } catch (e) {
        console.error('getTeamRoster', e)
        return []
    }
}

// ───────────────────────── Statistics ─────────────────────────

function stddev(values: number[], mean: number): number {
    if (values.length < 2) return 0
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1)
    return Math.sqrt(variance)
}

function meanStd(values: number[]) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    return { mean, std: stddev(values, mean) }
}

const CORE_STATS = ['pts', 'reb', 'ast'] as const

export async function getPlayerSeasonStats(playerId: number, season: string, threshold = 1.5) {
    const { data, error } = await seasonPlayerGames(STAT_COLS.join(', '), season)
        .eq('player_id', playerId)
        .gt('min', 0)

    if (error) console.error('getPlayerSeasonStats', error)
    if (error || !data?.length) return null

    const rows = data as any[]
    const n = rows.length

    const averages: Record<string, number> = {}
    const stddevs: Record<string, number> = {}
    for (const col of STAT_COLS) {
        const { mean, std } = meanStd(rows.map((r) => r[col] ?? 0))
        averages[col] = mean
        stddevs[col] = std
    }

    const pra = rows.map((r) => (r.pts ?? 0) + (r.reb ?? 0) + (r.ast ?? 0))
    const { mean: praMean, std: praStd } = meanStd(pra)

    // A game is an outlier if it is `threshold` standard deviations from the mean
    const isHigh = (v: number, mean: number, std: number) => std > 0 && v >= mean + threshold * std
    const isLow = (v: number, mean: number, std: number) => std > 0 && v <= mean - threshold * std

    let exceptionalGames = 0
    let poorGames = 0
    for (const row of rows) {
        if (CORE_STATS.some((c) => isHigh(row[c] ?? 0, averages[c], stddevs[c]))) exceptionalGames++
        if (CORE_STATS.some((c) => isLow(row[c] ?? 0, averages[c], stddevs[c]))) poorGames++
    }
    const highPraGames = pra.filter((v) => isHigh(v, praMean, praStd)).length

    return { playerId, gamesPlayed: n, averages, stddevs, praMean, praStd, exceptionalGames, poorGames, highPraGames }
}