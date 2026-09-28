type PlayerRow = {
    player_id: number
    player_name: string
    team: string
    position: string | null
    comment: string | null
    min: number | null
    pts: number | null
    reb: number | null
    ast: number | null
    stl: number | null
    blk: number | null
    tov: number | null
    fgm: number | null
    fga: number | null
    fg3m: number | null
    fg3a: number | null
    ftm: number | null
    fta: number | null
    plus_minus: number | null
}

function TeamTable({ team, players }: { team: string; players: PlayerRow[] }) {
    const sorted = [...players].sort((a, b) => {
        const aStarter = a.position ? 0 : 1
        const bStarter = b.position ? 0 : 1
        if (aStarter !== bStarter) return aStarter - bStarter
        return (b.pts ?? 0) - (a.pts ?? 0)
    })

    const active = sorted.filter((p) => p.min !== 0)
    const inactive = sorted.filter((p) => p.min === 0)

    return (
        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-4">
            <h2 className="text-base font-medium mb-3">{team}</h2>
            <table className="w-full text-sm border-collapse table-fixed">
                <colgroup>
                    <col className="w-auto" />
                    <col className="w-14" />
                    <col className="w-12" />
                    <col className="w-12" />
                    <col className="w-12" />
                    <col className="w-12" />
                    <col className="w-12" />
                    <col className="w-12" />
                    <col className="w-16" />
                    <col className="w-16" />
                    <col className="w-16" />
                    <col className="w-12" />
                </colgroup>
                <thead>
                    <tr className="text-[#8B93A6] text-left border-b border-[#2A3040]">
                        <th className="py-2 pr-3 font-medium">Player</th>
                        <th className="px-2 font-medium">MIN</th>
                        <th className="px-2 font-medium">PTS</th>
                        <th className="px-2 font-medium">REB</th>
                        <th className="px-2 font-medium">AST</th>
                        <th className="px-2 font-medium">STL</th>
                        <th className="px-2 font-medium">BLK</th>
                        <th className="px-2 font-medium">TOV</th>
                        <th className="px-2 font-medium">FG</th>
                        <th className="px-2 font-medium">3PT</th>
                        <th className="px-2 font-medium">FT</th>
                        <th className="px-2 font-medium">+/-</th>
                    </tr>
                </thead>
                <tbody>
                    {active.map((p) => (
                        <tr key={p.player_id} className="border-b border-[#2A3040]/50 hover:bg-[#22283A] transition-colors">
                            <td className="py-1.5 pr-3">
                                {p.player_name}
                                {p.position && <span className="text-[#8B93A6] text-xs ml-1">{p.position}</span>}
                            </td>
                            <td className="px-2">{p.min?.toFixed(1)}</td>
                            <td className="px-2">{p.pts}</td>
                            <td className="px-2">{p.reb}</td>
                            <td className="px-2">{p.ast}</td>
                            <td className="px-2">{p.stl}</td>
                            <td className="px-2">{p.blk}</td>
                            <td className="px-2">{p.tov}</td>
                            <td className="px-2">{p.fgm}-{p.fga}</td>
                            <td className="px-2">{p.fg3m}-{p.fg3a}</td>
                            <td className="px-2">{p.ftm}-{p.fta}</td>
                            <td className={`px-2 ${(p.plus_minus ?? 0) >= 0 ? 'text-[#5FA777]' : 'text-[#C4554D]'}`}>
                                {p.plus_minus !== null && p.plus_minus >= 0 ? `+${p.plus_minus}` : p.plus_minus}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {inactive.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#2A3040] text-xs text-[#8B93A6] space-y-1">
                    {inactive.map((p) => (
                        <div key={p.player_id}>
                            {p.player_name} — {p.comment || 'Did not play'}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function BoxScore({
    homeTeam,
    awayTeam,
    players,
}: {
    homeTeam: string
    awayTeam: string
    players: PlayerRow[]
}) {
    const homePlayers = players.filter((p) => p.team === homeTeam)
    const awayPlayers = players.filter((p) => p.team === awayTeam)
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TeamTable team={awayTeam} players={awayPlayers} />
            <TeamTable team={homeTeam} players={homePlayers} />
        </div>
    )
}