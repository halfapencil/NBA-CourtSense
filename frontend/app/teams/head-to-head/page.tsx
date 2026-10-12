import { getHeadToHeadPlayerStats, NBA_TEAMS } from "@/lib/teamStats";
import { getHeadToHead, seasonForDate } from "@/lib/teamStats";
import HeadToHeadSelector from "@/components/HeadToHeadSelector";

type H2HPlayerRow = {
    player_id: number
    player_name: string
    team: string
    gamesPlayed: number
    averages: Record<string, number>
}
function PlayerStatTable({ team, players }: { team: string; players: H2HPlayerRow[] }) {
    return (
        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-4">
            <h2 className="text-base font-medium mb-3">{team}</h2>
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="text-[#8B93A6] text-left border-b border-[#2A3040]">
                        <th className="py-2 pr-3 font-medium">Player</th>
                        <th className="px-2 font-medium">GP</th>
                        <th className="px-2 font-medium">PTS</th>
                        <th className="px-2 font-medium">REB</th>
                        <th className="px-2 font-medium">AST</th>
                        <th className="px-2 font-medium">STL</th>
                        <th className="px-2 font-medium">BLK</th>
                        <th className="px-2 font-medium">TOV</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map((p) => (
                        <tr key={p.player_id} className="border-b border-[#2A3040]/50 hover:bg-[#22283A] transition-colors">
                            <td className="py-1.5 pr-3">{p.player_name}</td>
                            <td className="px-2 text-[#8B93A6]">{p.gamesPlayed}</td>
                            <td className="px-2">{p.averages.pts.toFixed(1)}</td>
                            <td className="px-2">{p.averages.reb.toFixed(1)}</td>
                            <td className="px-2">{p.averages.ast.toFixed(1)}</td>
                            <td className="px-2">{p.averages.stl.toFixed(1)}</td>
                            <td className="px-2">{p.averages.blk.toFixed(1)}</td>
                            <td className="px-2">{p.averages.tov.toFixed(1)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
export default async function HeadToHeadPage({
    searchParams,
}: {
    searchParams: Promise<{ a?: string; b?: string; season?: string }>
}) {
    const params = await searchParams
    const teamA = params.a ?? 'BOS'
    const teamB = params.b ?? 'LAL'
    const season = params.season ?? seasonForDate(new Date())
    const { games, playersA, playersB } = await getHeadToHeadPlayerStats(teamA, teamB, season)
    const aWins = games.filter((g) => (g.home_team === teamA && g.home_win === 1) || (g.away_team === teamA && g.home_win === 0)).length
    const bWins = games.length - aWins

    return (
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
            <h1 className="text-2xl font-semibold">Head to Head</h1>

            <HeadToHeadSelector teamA={teamA} teamB={teamB} season={season} />

            {games.length === 0 ? (
                <p className="text-[#8B93A6]">No games between {teamA} and {teamB} in {season}.</p>
            ) : (
                <>
                    <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg px-6 py-5 text-center">
                        <span className="text-2xl font-semibold">{teamA} {aWins} - {bWins} {teamB}</span>
                        <div className="text-sm text-[#8B93A6] mt-1">{games.length} meetings this season</div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <PlayerStatTable team={teamA} players={playersA} />
                        <PlayerStatTable team={teamB} players={playersB} />
                    </div>
                </>
            )}
        </div>
    )
}