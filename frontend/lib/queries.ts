import { supabase } from "./supabase"

export type CompletedGames = {
    game_date: string
    home_team: string
    away_team: string
    home_win_prob: number
    actual_home_win: number
}

export async function getRecentGamesByDate(startDate: string, days = 5) {
    const start = new Date(startDate)
    const end = new Date(start)

    end.setDate(end.getDate() - days + 1)
    const { data, error } = await supabase
        .from('predictions')
        .select('game_date, home_team, away_team, home_win_prob, actual_home_win')
        .not('actual_home_win', 'is', null)
        .lte('game_date', start.toISOString().split('T')[0])
        .gte('game_date', end.toISOString().split('T')[0])
        .order('game_date', { ascending: false })

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

export async function getGame({ date, away, home }: { date: string; away: string; home: string }) {
    const { data } = await supabase
        .from('games')
        .select('*')
        .eq('game_date', date)
        .eq('home_team', home)
        .eq('away_team', away)
        .maybeSingle()
    return data
}