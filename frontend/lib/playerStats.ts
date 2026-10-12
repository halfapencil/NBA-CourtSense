import { supabase } from "./supabase";
import { seasonDateRange } from "./teamStats";

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