import Link from "next/link"
import { CompletedGames, getRecentGamesByDate } from "@/lib/queries"
import { DateNav } from "@/components/DateNav"

export default async function GamesHistory({
    searchParams,
}: {
    searchParams: Promise<{ start?: string }>
}) {
    const params = await searchParams
    const startDate = params.start ?? getDefaultStartDate()
    const columns = await getRecentGamesByDate(startDate, 5)

    return (
        <div>
            <h1 className="text-2xl font-semibold">Games Results</h1>
            <DateNav currentStart={startDate} />
            {columns.length === 0 ? (
                <p className="text-[#8B93A6]"> No games completed.</p>
            ) : (
                <div className="space-y-2">
                    {columns.map(([date, games]) => (
                        <DateColumn key={date} date={date} games={games} />
                    ))}
                </div>
            )}
        </div>
    )

}
function getDefaultStartDate(): string {
    const d = new Date("2025-01-10")
    d.setDate(d.getDate() - 4)
    return d.toISOString().split('T')[0]
}

function GameCell({ game }: { game: any }) {
    const predictedHomeWin = game.home_win_prob >= 0.5
    const wasCorrect = (predictedHomeWin ? 1 : 0) === game.actual_home_win
    const winner = game.actual_home_win === 1 ? game.home_team : game.away_team
    const loser = game.actual_home_win === 1 ? game.away_team : game.home_team

    return (
        <Link
            href={`/games/${game.game_date}-${game.away_team}-${game.home_team}`}
            className="block bg-[#1A1F2B] border border-[#2A3040] rounded-lg px-3 py-2 hover:border-[#3D5A80] transition-colors">
            <div className="flex items-center gap-4">
                <span className="font-medium">
                    {winner} <span className="text-[#8B93A6]"> wins vs </span> {loser}
                </span>
            </div>
            <span className={`text-sm font-medium ${wasCorrect ? 'text-[#5FA777]' : 'text-[#C4554D]'}`}>
                {wasCorrect ? '✓ Correct' : '✗ Missed'}

            </span>
        </Link>
    )
}

function DateColumn({ date, games }: { date: string, games: any[] }) {
    return (
        <div>
            <div className="text-sm font-medium text-[#8B93A6] mb-3 pb-2 border-b border-[#2A3040]">
                {date}
            </div>
            <div className="flex gap-2 overflow-x-auto">
                {games.map((game) => (
                    <GameCell key={`${game.home_team}-${game.away_team}`} game={game} />
                ))}
            </div>
        </div>
    )
}

