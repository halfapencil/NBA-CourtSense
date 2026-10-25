import { notFound } from "next/navigation"
import { parseGameParams } from "@/lib/parseGameParams"
import BoxScore from "@/components/BoxScore"
import { getGame, getPlayerBoxScore, getGamePredictions } from "@/lib/queries"
function spreadLabel(spread: number, home: string, away: string): string {
  if (spread === 0) return "Pick'em"
  return `${spread > 0 ? home : away} -${Math.abs(spread)}`
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params
  const parsed = parseGameParams(gameId)
  if (!parsed) notFound()
  const game = await getGame(parsed)
  if (!game) notFound()
  const players = await getPlayerBoxScore(game.game_id)
  const predictions = await getGamePredictions(parsed.home, parsed.away, parsed.date)
  if (!predictions) notFound()
  return (
    <div className="max-w-[1800px] mx-auto px-6 py-8 space-y-6">
      <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg px-6 py-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-[#8B93A6] mb-1">{parsed.date}</div>
          <h1 className="text-2xl font-semibold">
            {parsed.away} <span className="text-[#8B93A6] font-normal">@</span> {parsed.home}
          </h1>
          {predictions && (
            <div className="mt-1 space-y-0.5 text-base text-[#8B93A6]">
              <div>
                {((1 - predictions.home_win_prob) * 100).toFixed(1)}% {parsed.away} to{" "}
                {(predictions.home_win_prob * 100).toFixed(1)}% {parsed.home}
              </div>
              <div className="text-sm">
                Implied spread: {spreadLabel(predictions.implied_spread, parsed.home, parsed.away)}
                <span className="mx-2">·</span>
                Model spread: {spreadLabel(predictions.model_spread, parsed.home, parsed.away)}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-[auto_auto_auto] items-center justify-items-center gap-x-4 tabular-nums">
          <span className="text-3xl font-semibold">{game.away_pts}</span>
          <span className="text-[#8B93A6] text-xl">-</span>
          <span className="text-3xl font-semibold">{game.home_pts}</span>

          <span className="text-xs uppercase tracking-wide text-[#8B93A6]">{parsed.away}</span>
          <span />
          <span className="text-xs uppercase tracking-wide text-[#8B93A6]">{parsed.home}</span>
        </div>
      </div>

      <BoxScore homeTeam={game.home_team} awayTeam={game.away_team} players={players} />
    </div>
  )
}