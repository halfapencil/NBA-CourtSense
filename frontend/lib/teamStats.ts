import { supabase } from "./supabase"

// ───────────────────────── Constants ─────────────────────────

// One list of box-score stats, shared by the team table and the position table.
const STATS = [
    'pts', 'oreb', 'dreb', 'reb', 'ast', 'stl', 'blk', 'tov', 'pf',
    'fgm', 'fga', 'fg3m', 'fg3a', 'ftm', 'fta',
] as const
export const STAT_COLS: string[] = [...STATS]
export const POS_STAT_KEYS = STATS
export type PosStatKey = (typeof STATS)[number]

// All nba team abbreviations, to be updated when expansion occurs
export const NBA_TEAMS = [
    'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
    'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
    'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS',
]

export const TEAM_CONFERENCE: Record<string, 'East' | 'West'> = {
    ATL: 'East', BOS: 'East', BKN: 'East', CHA: 'East', CHI: 'East',
    CLE: 'East', DET: 'East', IND: 'East', MIA: 'East', MIL: 'East',
    NYK: 'East', ORL: 'East', PHI: 'East', TOR: 'East', WAS: 'East',
    DAL: 'West', DEN: 'West', GSW: 'West', HOU: 'West', LAC: 'West',
    LAL: 'West', MEM: 'West', MIN: 'West', NOP: 'West', OKC: 'West',
    PHX: 'West', POR: 'West', SAC: 'West', SAS: 'West', UTA: 'West',
}

export const SHARE_STATS = ['pts', 'reb', 'ast', 'stl', 'blk', 'tov']
export type ShareStat = (typeof SHARE_STATS)[number]
export type ShareKey = 'min' | ShareStat | 'usg'

// ───────────────────────── Types ─────────────────────────

export type StandingRow = {
    team: string
    wins: number
    losses: number
    pct: number
    gb: number
    last10: string
    conference: 'East' | 'West'
}

type TeamGameRow = {
    game_id: string
    game_date: string
    home_team: string
    away_team: string
    home_win: number
    [key: string]: any
}

type PlayerGameRow = {
    game_id: string
    game_date: string
    player_id: string | number
    player_name: string | null
    team: string
    position: string | null
    min: number | null
    [key: string]: any
}

export type PlayerStatShare = {
    playerId: string
    name: string
    gp: number
    minutes: number
    shares: Record<string, number>
}

// One row per game for a single team
export type TeamGameLogRow = {
    game_id: string
    game_date: string
    opponent: string
    is_home: boolean
    win: boolean
    restDays: number | null
    [key: string]: any
}

export type PositionGroup = 'G' | 'F' | 'C' | 'BENCH'
export const POS_ORDER: PositionGroup[] = ['G', 'F', 'C', 'BENCH']
export type StatRecord = Record<PosStatKey, number>

export interface PositionAgg {
    pos: PositionGroup
    avg: StatRecord          // per game, whole season
    share: StatRecord        // share of team total (0-1), whole season
    recentShare: StatRecord  // share of team total, last N games
}

// ───────────────────────── Shared helpers ─────────────────────────

const teamFilter = (team: string) => `home_team.eq.${team},away_team.eq.${team}`

const isPlayed = (r: { min?: unknown }) => Number(r.min) > 0

const zeroStats = () => Object.fromEntries(STAT_COLS.map((c) => [c, 0])) as Record<string, number>

const daysBetween = (a: string, b: string) =>
    Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)

const seasonLabel = (startYear: number) =>
    `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`

export function seasonForDate(date: Date): string {
    const year = date.getUTCFullYear()
    const startYear = date.getUTCMonth() >= 9 ? year : year - 1
    return seasonLabel(startYear)
}

export function seasonDateRange(season: string): { start: string; end: string } {
    const [startYear] = season.split('-')
    return { start: `${startYear}-10-01`, end: `${Number(startYear) + 1}-09-30` }
}

// Supabase returns at most 1000 rows per request, so anything bigger must be paged.
// `build` must include a deterministic .order() or pages can overlap.
const PAGE_SIZE = 1000
export async function fetchAll(build: (from: number, to: number) => PromiseLike<any>): Promise<any[]> {
    const rows: any[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await build(from, from + PAGE_SIZE - 1)
        if (error) throw new Error(error.message)
        if (!data?.length) break
        rows.push(...data)
        if (data.length < PAGE_SIZE) break
    }
    return rows
}

// ───────────────────────── Games (one query per team page) ─────────────────────────

async function fetchTeamGames(team: string, season: string, asOfDate?: string): Promise<TeamGameRow[]> {
    const { start, end } = seasonDateRange(season)
    const { data, error } = await supabase
        .from('games')
        .select('*')
        .or(teamFilter(team))
        .gte('game_date', start)
        .lte('game_date', asOfDate && asOfDate < end ? asOfDate : end)
        .order('game_date', { ascending: true })
    if (error) {
        console.error('fetchTeamGames', error.message)
        return []
    }
    return (data ?? []) as TeamGameRow[]
}

// Turns raw games into one row per game from `team`'s point of view.
function buildGameLog(team: string, games: TeamGameRow[]): TeamGameLogRow[] {
    return games.map((g, i) => {
        const isHome = g.home_team === team
        const own = isHome ? 'home_' : 'away_'
        const opp = isHome ? 'away_' : 'home_'
        const row: TeamGameLogRow = {
            game_id: g.game_id,
            game_date: g.game_date,
            opponent: isHome ? g.away_team : g.home_team,
            is_home: isHome,
            win: isHome ? g.home_win === 1 : g.home_win === 0,
            // days OFF between games, not days between game dates
            restDays: i === 0 ? null : daysBetween(games[i - 1].game_date, g.game_date) - 1,
        }
        for (const c of STAT_COLS) {
            row[c] = g[own + c]
            row[`opp_${c}`] = g[opp + c]
        }
        return row
    })
}

// Record plus the team's and opponents' per-game averages, derived from the game log.
function summarizeLog(team: string, log: TeamGameLogRow[]) {
    if (!log.length) return null

    let homeWin = 0, homeLoss = 0, awayWin = 0, awayLoss = 0
    const totals = zeroStats()
    const oppTotals = zeroStats()

    for (const r of log) {
        if (r.win) r.is_home ? homeWin++ : awayWin++
        else r.is_home ? homeLoss++ : awayLoss++
        for (const c of STAT_COLS) {
            totals[c] += r[c] ?? 0
            oppTotals[c] += r[`opp_${c}`] ?? 0
        }
    }

    const n = log.length
    const averages = zeroStats()
    const oppAverages = zeroStats()
    for (const c of STAT_COLS) {
        averages[c] = totals[c] / n
        oppAverages[c] = oppTotals[c] / n
    }

    return {
        team,
        gamesPlayed: n,
        wins: homeWin + awayWin,
        losses: homeLoss + awayLoss,
        averages,
        oppAverages,
        homeWin,
        homeLoss,
        awayWin,
        awayLoss,
        lastGameDate: log[n - 1].game_date,
    }
}

// ───────────────────────── Player rows (one paged query per team page) ─────────────────────────

const PLAYER_COLS = ['game_id', 'player_id', 'player_name', 'team', 'position', 'min', ...STAT_COLS].join(', ')

// Every player row (both teams) for the given games, DNPs removed.
// Splitting into "team" vs "opponents" happens in JS, so one query serves
// the share table, the team position table, and the opponent position table.
async function fetchPlayerRows(games: TeamGameRow[]): Promise<PlayerGameRow[]> {
    if (!games.length) return []
    const dateById = new Map(games.map((g) => [String(g.game_id), g.game_date]))
    const ids = [...dateById.keys()]

    const rows = await fetchAll((from, to) =>
        supabase
            .from('player_games')
            .select(PLAYER_COLS)
            .in('game_id', ids)
            .order('game_id', { ascending: true })
            .order('player_id', { ascending: true })
            .range(from, to)
    )

    return rows
        .map((r) => ({ ...r, game_id: String(r.game_id), game_date: dateById.get(String(r.game_id))! }) as PlayerGameRow)
        .filter(isPlayed)
}

// ───────────────────────── Player stat shares ─────────────────────────

const SHARE_ACCUM = ['min', ...SHARE_STATS, 'fga', 'fta']

function computeStatShare(rows: PlayerGameRow[], teamGames: number) {
    const zero = () => Object.fromEntries(SHARE_ACCUM.map((k) => [k, 0])) as Record<string, number>
    const addInto = (target: Record<string, number>, src: Record<string, any>) => {
        for (const k of SHARE_ACCUM) target[k] += Number(src[k]) || 0
    }

    // team totals for each game
    const teamByGame = new Map<string, Record<string, number>>()
    for (const r of rows) {
        if (!teamByGame.has(r.game_id)) teamByGame.set(r.game_id, zero())
        addInto(teamByGame.get(r.game_id)!, r)
    }

    // each player's totals, and the team's totals in the games he played
    const byPlayer = new Map<string, { name: string; gp: number; totals: Record<string, number>; teamTotals: Record<string, number> }>()
    for (const r of rows) {
        const id = String(r.player_id)
        if (!byPlayer.has(id)) {
            byPlayer.set(id, { name: r.player_name ?? id, gp: 0, totals: zero(), teamTotals: zero() })
        }
        const p = byPlayer.get(id)!
        p.gp += 1
        addInto(p.totals, r)
        addInto(p.teamTotals, teamByGame.get(r.game_id)!)
    }

    const share = (part: number, total: number) => (total > 0 ? part / total : 0)
    const usage = (t: Record<string, number>) => t.fga + 0.44 * t.fta + t.tov

    const players: PlayerStatShare[] = []
    for (const [playerId, p] of byPlayer) {
        const shares = { min: share(p.totals.min, p.teamTotals.min) } as Record<ShareKey, number>
        for (const s of SHARE_STATS) shares[s] = share(p.totals[s], p.teamTotals[s])
        shares.usg = share(usage(p.totals), usage(p.teamTotals))
        players.push({ playerId, name: p.name, gp: p.gp, minutes: p.totals.min, shares })
    }
    players.sort((a, b) => b.minutes - a.minutes)

    return { players, teamGames, gamesWithBoxScores: teamByGame.size }
}

// ───────────────────────── Position aggregation ─────────────────────────

type GameAgg = { date: string; pos: Record<PositionGroup, StatRecord> }

const mapStats = (fn: (k: PosStatKey) => number): StatRecord =>
    Object.fromEntries(STATS.map((k) => [k, fn(k)])) as StatRecord

const emptyByPos = () =>
    Object.fromEntries(POS_ORDER.map((p) => [p, mapStats(() => 0)])) as Record<PositionGroup, StatRecord>

// Empty-string and unexpected positions count as bench
const normalizePos = (p: string | null): PositionGroup => {
    const v = (p ?? '').trim().toUpperCase()
    return v === 'G' || v === 'F' || v === 'C' ? v : 'BENCH'
}

function sumGames(list: GameAgg[]) {
    const out = emptyByPos()
    for (const g of list)
        for (const p of POS_ORDER)
            for (const k of STATS) out[p][k] += g.pos[p][k]
    return out
}

function aggregatePositions(rows: PlayerGameRow[], recentN: number): PositionAgg[] | null {
    if (!rows.length) return null

    const byGame = new Map<string, GameAgg>()
    for (const r of rows) {
        if (!byGame.has(r.game_id)) byGame.set(r.game_id, { date: r.game_date, pos: emptyByPos() })
        const bucket = byGame.get(r.game_id)!.pos[normalizePos(r.position)]
        for (const k of STATS) bucket[k] += Number(r[k]) || 0
    }

    const games = [...byGame.values()].sort((a, b) => a.date.localeCompare(b.date))
    const seasonTot = sumGames(games)
    const recentTot = sumGames(games.slice(-recentN))

    const shareOf = (tot: typeof seasonTot, pos: PositionGroup) =>
        mapStats((k) => {
            const total = POS_ORDER.reduce((t, p) => t + tot[p][k], 0)
            return total ? tot[pos][k] / total : 0
        })

    return POS_ORDER.map((pos) => ({
        pos,
        avg: mapStats((k) => seasonTot[pos][k] / games.length),
        share: shareOf(seasonTot, pos),
        recentShare: shareOf(recentTot, pos),
    }))
}

// ───────────────────────── Public API: team page ─────────────────────────

// Everything the Teams page needs, from one games query and one paged player_games query.
export async function getTeamPageData(team: string, season: string, recentN = 10) {
    const games = await fetchTeamGames(team, season)
    const log = buildGameLog(team, games)
    const stats = summarizeLog(team, log)

    let shares: ReturnType<typeof computeStatShare> | null = null
    let posAgg: PositionAgg[] | null = null
    let oppAgg: PositionAgg[] | null = null
    try {
        const rows = await fetchPlayerRows(games)
        const own = rows.filter((r) => r.team === team)
        shares = computeStatShare(own, games.length)
        posAgg = aggregatePositions(own, recentN)
        oppAgg = aggregatePositions(rows.filter((r) => r.team !== team), recentN)
    } catch (e) {
        console.error('getTeamPageData: player rows', e)
    }

    return { stats, log, shares, posAgg, oppAgg }
}

// Single-purpose wrappers, kept so other pages that import them keep working.
export async function getTeamSeasonStats(team: string, season: string, asOfDate?: string) {
    return summarizeLog(team, buildGameLog(team, await fetchTeamGames(team, season, asOfDate)))
}

export async function getTeamGameLog(team: string, season: string): Promise<TeamGameLogRow[]> {
    return buildGameLog(team, await fetchTeamGames(team, season))
}

export async function getTeamStatShare(team: string, season: string) {
    const games = await fetchTeamGames(team, season)
    const rows = await fetchPlayerRows(games)
    return computeStatShare(rows.filter((r) => r.team === team), games.length)
}

// Seasons a team has games in. Two one-row queries (first and last game)
// instead of downloading every game the team ever played.
export async function getAvailableSeasons(team: string): Promise<string[]> {
    const edge = (ascending: boolean) =>
        supabase.from('games').select('game_date').or(teamFilter(team))
            .order('game_date', { ascending }).limit(1)

    const [first, last] = await Promise.all([edge(true), edge(false)])
    const firstDate = first.data?.[0]?.game_date
    const lastDate = last.data?.[0]?.game_date
    if (first.error || last.error || !firstDate || !lastDate) return []

    const startYear = (d: string) => parseInt(seasonForDate(new Date(d)).slice(0, 4), 10)
    const seasons: string[] = []
    for (let y = startYear(lastDate); y >= startYear(firstDate); y--) seasons.push(seasonLabel(y))
    return seasons // newest first
}

// ───────────────────────── Head to head ─────────────────────────

export async function getHeadToHead(teamA: string, teamB: string, season: string) {
    const { start, end } = seasonDateRange(season)
    const { data, error } = await supabase
        .from('games')
        .select('*')
        .or(`and(home_team.eq.${teamA},away_team.eq.${teamB}),and(home_team.eq.${teamB},away_team.eq.${teamA})`)
        .gte('game_date', start)
        .lte('game_date', end)
        .order('game_date', { ascending: false })

    if (error) {
        console.error(error)
        return []
    }
    return data ?? []
}

export async function getHeadToHeadPlayerStats(teamA: string, teamB: string, season: string) {
    const games = await getHeadToHead(teamA, teamB, season)
    if (games.length === 0) return { games: [], playersA: [], playersB: [] }

    const { data, error } = await supabase
        .from('player_games')
        .select('*')
        .in('game_id', games.map((g) => g.game_id))

    if (error || !data) {
        console.error('getHeadToHeadPlayerStats error', error)
        return { games, playersA: [], playersB: [] }
    }

    const byPlayer = new Map<number, { player_name: string; team: string; games: number; totals: Record<string, number> }>()
    // DNP rows are skipped, otherwise they would dilute the averages
    for (const row of data.filter(isPlayed)) {
        if (!byPlayer.has(row.player_id)) {
            byPlayer.set(row.player_id, { player_name: row.player_name, team: row.team, games: 0, totals: zeroStats() })
        }
        const entry = byPlayer.get(row.player_id)!
        entry.games += 1
        for (const c of STAT_COLS) entry.totals[c] += row[c] ?? 0
    }

    const allPlayers = [...byPlayer.entries()].map(([player_id, p]) => ({
        player_id,
        player_name: p.player_name,
        team: p.team,
        gamesPlayed: p.games,
        averages: Object.fromEntries(STAT_COLS.map((c) => [c, p.totals[c] / p.games])),
    }))

    const byGamesThenPts = (a: (typeof allPlayers)[number], b: (typeof allPlayers)[number]) =>
        b.gamesPlayed - a.gamesPlayed || b.averages.pts - a.averages.pts

    return {
        games,
        playersA: allPlayers.filter((p) => p.team === teamA).sort(byGamesThenPts),
        playersB: allPlayers.filter((p) => p.team === teamB).sort(byGamesThenPts),
    }
}

// ───────────────────────── Standings ─────────────────────────

export async function getStandings(season: string) {
    const { start, end } = seasonDateRange(season)

    const games = await fetchAll((from, to) =>
        supabase
            .from('games')
            .select('game_id, game_date, home_team, away_team, home_win')
            .gte('game_date', start)
            .lte('game_date', end)
            .order('game_date', { ascending: true })
            .order('game_id', { ascending: true })
            .range(from, to)
    )

    const records = new Map<string, { wins: number; loss: number; results: boolean[] }>()
    for (const team of Object.keys(TEAM_CONFERENCE)) {
        records.set(team, { wins: 0, loss: 0, results: [] })
    }
    for (const g of games) {
        const home = records.get(g.home_team)
        const away = records.get(g.away_team)
        if (!home || !away) continue
        const homeWon = g.home_win === 1
        if (homeWon) { home.wins++; away.loss++ } else { away.wins++; home.loss++ }
        home.results.push(homeWon)
        away.results.push(!homeWon)
    }

    const rows: StandingRow[] = []
    for (const [team, r] of records) {
        const gp = r.wins + r.loss
        const last10 = r.results.slice(-10)
        const l10Wins = last10.filter(Boolean).length
        rows.push({
            team,
            conference: TEAM_CONFERENCE[team],
            wins: r.wins,
            losses: r.loss,
            pct: gp > 0 ? r.wins / gp : 0,
            gb: 0,
            last10: last10.length ? `${l10Wins}-${last10.length - l10Wins}` : '-',
        })
    }

    const rank = (list: StandingRow[]): StandingRow[] => {
        const sorted = [...list].sort(
            (a, b) => b.pct - a.pct || b.wins - a.wins || a.team.localeCompare(b.team)
        )
        const leader = sorted[0]
        return sorted.map((r) => ({
            ...r,
            gb: (leader.wins - r.wins + (r.losses - leader.losses)) / 2,
        }))
    }

    return {
        east: rank(rows.filter((r) => r.conference === 'East')),
        west: rank(rows.filter((r) => r.conference === 'West')),
        overall: rank(rows),
    }
}