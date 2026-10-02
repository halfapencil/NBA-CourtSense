import { notFound } from "next/navigation"
import { parseGameParams } from "@/lib/parseGameParams"
import BoxScore from "@/components/BoxScore"
import { getGame, getPlayerBoxScore } from "@/lib/queries"


export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params
  const parsed = parseGameParams(gameId)
  if (!parsed) notFound()
  const game = await getGame(parsed)
  console.log(game)
  if (!game) notFound()
  const players = await getPlayerBoxScore(game.game_id)
  console.log(players)
  return (
    <div className="max-w-[1800px] mx-auto px-6 py-8 space-y-6">
      <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg px-6 py-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-[#8B93A6] mb-1">{parsed.date}</div>
          <h1 className="text-2xl font-semibold">
            {parsed.away} <span className="text-[#8B93A6] font-normal">@</span> {parsed.home}
          </h1>
        </div>
        {game && (
          <div className="text-3xl font-semibold tabular-nums">
            {game.away_pts} <span className="text-[#8B93A6] text-xl">-</span> {game.home_pts}
          </div>
        )}
      </div>

      {(
        <BoxScore homeTeam={game.home_team} awayTeam={game.away_team} players={players} />
      )}
    </div>
  )
}