import { supabase } from "./supabase";
import { seasonDateRange, STAT_COLS } from "./teamStats";

export type RosterPlayer = { player_id: number; player_name: string }

export async function getTeamRoster(team: string, season: string): Promise<RosterPlayer[]> {
    const { start, end } = seasonDateRange(season)

    const { data, error } = await supabase
        .from('player_games')
        .select('player_id, player_name, games!inner(game_date)')
        .eq('team', team)
        .gte('games.game_date', start)
        .lte('games.game_date', end)

    if (error || !data) {
        console.log(error)
        return []
    }
    const seen = new Map<number, string>()
    for (const row of data as any[]) {
        if (!seen.has(row.player_id)) seen.set(row.player_id, row.player_name)
    }

    return Array.from(seen.entries())
        .map(([player_id, player_name]) => ({ player_id, player_name }))
        .sort((a, b) => a.player_name.localeCompare(b.player_name))
}

function stddev(values: number[], mean: number): number {
    if (values.length < 2) return 0
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1)
    return Math.sqrt(variance)
}

export async function getPlayerSeasonStats(playerId: number, season: string, threshold = 1.5) {
    const { start, end } = seasonDateRange(season)

    const { data, error } = await supabase
        .from("games")
        .select("*")
        .gte("game_date", start)
        .lte("game_date", end)

    if (error || !data || data.length === 0) {
        if (error) console.error('getPlayerSeasonStats', error)
        return null
    }
    const gameIds = data.map((g) => g.game_id)

    const { data: player_data, error: player_error } = await supabase
        .from('player_games')
        .select("*")
        .eq('player_id', playerId)
        .in('game_id', gameIds)
    if (player_error || !player_data || player_data.length === 0) {
        console.error("Player error", player_error)
        return (null)
    }
    const stddevs: Record<string, number> = {}
    const n = player_data.length
    const averages: Record<string, number> = {}

    for (const col of STAT_COLS) {
        const values = player_data.map((row: any) => row[col] ?? 0)
        const mean = values.reduce((a, b) => a + b, 0) / n
        averages[col] = mean
        stddevs[col] = stddev(values, mean)
    }

    const praValues = player_data.map((row: any) => (row.pts ?? 0) + (row.reb ?? 0) + (row.ast ?? 0))
    const praMean = praValues.reduce((a, b) => a + b, 0) / n
    const praStd = stddev(praValues, praMean)


    const coreStats = ['pts', 'reb', 'ast']
    let exceptionalGames = 0
    let poorGames = 0

    player_data.forEach((row: any) => {
        const isExceptional = coreStats.some((col) => stddevs[col] > 0 && row[col] >= averages[col] + threshold * stddevs[col])
        const isPoor = coreStats.some((col) => stddevs[col] > 0 && row[col] <= averages[col] - threshold * stddevs[col])

        if (isExceptional) exceptionalGames++
        if (isPoor) poorGames++
    })

    const highPraGames = praValues.filter((v) => praStd > 0 && v >= praMean + threshold * praStd).length

    return { playerId, gamesPlayed: n, averages, stddevs, praMean, praStd, exceptionalGames, poorGames, highPraGames }
}