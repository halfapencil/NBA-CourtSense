import { supabase } from "./supabase"

export type CompletedGames = {
    game_date: string
    home_team: string
    away_team: string
    home_win_prob: number
    actual_home_win: number
}

export async function getRecentGamesByDate(days = 5) {
    const { data, error } = await supabase
        .from('predictions')
        .select('game_date, home_team, away_team, home_win_prob, actual_home_win')
        .not('actual_home_win', 'is', null)
        .order('game_date', { ascending: false })
        .limit(100)

    if (error) {
        console.error("Error getting completed games", error)
        return []
    }
    const byDate = new Map<string, CompletedGames[]>()

    for (const game of data ?? []) {
        if (!byDate.has(game.game_date)) byDate.set(game.game_date, [])
        byDate.get(game.game_date)!.push(game)
    }
    return Array.from(byDate.entries())
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .slice(0, days)
}