import { supabase } from "./supabase"
import { fetchAll, seasonDateRange, NBA_TEAMS, STAT_COLS } from "./teamStats"

type StatMap = Record<string, number>

export type TeamRating = {
    team: string
    gp: number
    net: number

    ortg: number
    efg: number
    tovPct: number

    drtg: number
    oppEfg: number
    oppTovPct: number

    perGame: StatMap
    oppPerGame: StatMap
}
const STAT_LABELS: Record<string, string> = {
    pts: 'Points', reb: 'Rebounds', oreb: 'Offensive rebounds', dreb: 'Defensive rebounds',
    ast: 'Assists', stl: 'Steals', blk: 'Blocks', tov: 'Turnovers', pf: 'Fouls',
    fgm: 'FG made', fga: 'FG attempted', fg3m: '3PT made', fg3a: '3PT attempted',
    ftm: 'FT made', fta: 'FT attempted',
}
export const LEADER_STATS = STAT_COLS.map((key) => ({ key, label: STAT_LABELS[key] ?? key.toUpperCase() }))

const zero = (): StatMap => Object.fromEntries(STAT_COLS.map((c) => [c, 0]))
const average = (t: StatMap, n: number): StatMap => Object.fromEntries(STAT_COLS.map((c) => [c, t[c] / n]))

const possessions = (t: StatMap) => t.fga + 0.44 * t.fta - t.oreb + t.tov
const tovRate = (t: StatMap) => t.tov / (t.fga + 0.44 * t.fta + t.tov)
const efg = (t: StatMap) => (t.fgm + 0.5 * t.fg3m) / t.fga

export async function getTeamRatings(season: string): Promise<TeamRating[]> {
    const { start, end } = seasonDateRange(season)
    const columns = [
        'game_id', 'game_date', 'home_team', 'away_team',
        ...STAT_COLS.flatMap((c) => [`home_${c}`, `away_${c}`])
    ].join(', ')
    const games = await fetchAll((from, to) =>
        supabase
            .from('games')
            .select(columns)
            .gte('game_date', start)
            .lte('game_date', end)
            .order('game_date', { ascending: true })
            .order('game_id', { ascending: true })
            .range(from, to)
    )

    const own = new Map<string, StatMap>()
    const opp = new Map<string, StatMap>()
    const gp = new Map<string, number>()
    for (const t of NBA_TEAMS) {
        own.set(t, zero())
        opp.set(t, zero())
        gp.set(t, 0)
    }

    for (const g of games) {
        if (g.home_pts == null || g.away_pts == null) continue
        const sides = [
            [g.home_team, 'home_', 'away_'],
            [g.away_team, 'away_', 'home_'],
        ] as const

        for (const [team, mine, theirs] of sides) {
            const o = own.get(team)
            const p = opp.get(team)
            if (!o || !p) continue
            gp.set(team, gp.get(team)! + 1)
            for (const c of STAT_COLS) {
                o[c] += g[mine + c] ?? 0
                p[c] += g[theirs + c] ?? 0
            }
        }
    }
    return NBA_TEAMS.filter((t) => gp.get(t)! > 0).map((team) => {
        const o = own.get(team)!
        const p = opp.get(team)!
        const n = gp.get(team)!

        const ortg = (100 * o.pts) / possessions(o)
        const drtg = (100 * p.pts) / possessions(p)

        return {
            team,
            gp: n,
            net: ortg - drtg,
            ortg,
            efg: efg(o),
            tovPct: tovRate(o),
            drtg,
            oppEfg: efg(p),
            oppTovPct: tovRate(p),
            perGame: average(o, n),
            oppPerGame: average(p, n)

        }
    })
}
