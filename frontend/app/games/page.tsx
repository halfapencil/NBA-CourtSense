import Link from "next/link"
import { CompletedGames, getCompletedGames } from "@/lib/queries"

export default async function GamesHistory() {
    const games = await getCompletedGames()

    return (
        <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold">Games</h1>

            {games.length === 0 ? (
                <p className="text-[#8B93A6]"> No games completed.</p>
            ) : (
                <div className="space-y-2">
                    {games.map((game) => (
                        <GameRow key={`${game.game_date}-${game.home_team}-${game.away_team}`} game={game} />
                    ))}
                </div>
            )}
        </div>
    )

}

function GameRow({ game }: { game: CompletedGame }) {
    const predictedHomeWin = game.home_win_prob
    const wasCorrect = (predictedHomeWin ? 1 : 0) === game.actual_home_win
    const winner = game.actual_home_win === 1 ? game.home_team : game.away_team
    const loser = game.actual_home_win === 1 ? game.away_team : game.home_team
    const gameId = `${game.game_date}-${game.away_team}-${game.home_team}`

    return (
        <Link
            href={`games/${gameId}`}
            className="flex items-center justify-between bg-[#1A1F2b] border border-[#2A3040] rounded-lg px-5 py-3 hover:border-[#3D5A80] transition-colors">
            <div className="flex items-center gap-4">
                <span className="text-sm text-[8B93A6] w-24">{game.game_date}</span>
                <span className="font-medium">
                    {winner} <span className="text-[#8B93A6]"> def.</span> {loser}
                </span>
            </div>
            <span className={`text-sm font-medium${wasCorrect ? 'text-[#5FA777]' : 'text-[#C4554D]'}`}>
                {wasCorrect ? '✓ Correct' : '✗ Missed'}

            </span>
        </Link>
    )
}

type CompletedGame = Awaited<ReturnType<typeof getCompletedGames>>[number]