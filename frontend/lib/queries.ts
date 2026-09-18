import { supabase } from "./supabase"

export type CompletedGames = {
    game_date: string
    home_team: string
    away_team: string
    home_win_prob: number
    actual_home_win: number
}

export async function getCompletedGames(limit = 50): Promise<CompletedGames[]> {
    const { data, error } = await supabase
        .from('predictions')
        .select('game_date, home_team, away_team, home_win_prob, actual_home_win')
        .not('actual_home_win', 'is', null)
        .order('game_date', { ascending: false })
        .limit(limit)

    if (error) {
        console.error("Error getting completed games", error)
        return []
    }
    return data ?? []
}