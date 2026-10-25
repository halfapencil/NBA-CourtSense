import { supabase } from '@/lib/supabase';
import { StatCard } from '@/components/StatCard';
import { getStandings, seasonForDate } from '@/lib/teamStats';
import Standings from '@/components/Standings';


type Prediction = {
  game_date: string
  home_team: string
  away_team: string
  home_win_prob: number
  implied_spread: number
  model_spread: number
}

async function getTodaysPredictions(): Promise<Prediction[]> {

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  const { data, error } = await supabase
    .from('predictions')
    .select("game_date, home_team, away_team, home_win_prob, implied_spread, model_spread")
    .eq("game_date", today)
    .order("home_win_prob", { ascending: false })

  if (error) {
    console.error("Failed to load predictions", error)
    return []
  }

  return data ?? []
}

async function getModelStats() {
  const { data } = await supabase
    .from('predictions')
    .select('home_win_prob, actual_home_win')
    .not("actual_home_win", "is", null)

  if (!data || data.length === 0) return { accuracy: null, total: 0 }

  const correct = data.filter((p) => (p.home_win_prob >= 0.5 ? 1 : 0) === p.actual_home_win).length
  return { accuracy: (correct / data.length) * 100, total: data.length }
}

async function loadStandings(date: string) {
  try {
    const result = await getStandings(seasonForDate(new Date("2026-10-25")))
    return result
  } catch (err) {
    console.error(err)
    return null
  }
}

// Landing page, shows predictions, track record and the schedule for the day.
export default async function Home() {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const [predictions, stats, standings] = await Promise.all([getTodaysPredictions(), getModelStats(), loadStandings(date)])
  return (
    <div>
      <h1 className='text-2xl font-semibold mb-6'>Overview</h1>

      <div className='grid gap-8 xl:grid-cols-[minmax(0,720px)_420px] items-start'>
        <div className='min-w-0'>
          <div className='grid grid-cols-3 gap-4 mb-10'>
            <StatCard
              label='Season accuracy'
              value={stats.accuracy !== null ? `${stats.accuracy.toFixed(1)}%` : '-'}
              sublabel={`${stats.total} games predicted`}
            />
            <StatCard label='Games Today' value={String(predictions.length)} />
            <StatCard label='Model' value='Logistic Regression' sublabel='v1' />
          </div>

          <h2 className='text-3xl font-semibold mb-8'>NBA Predictions for {date}</h2>
          {predictions.length === 0 ? (
            <p className='text-[#8B93A6]'>No games scheduled today, or predictions are not available</p>
          ) : (
            <div className='space-y-3'>
              {predictions.map((game) => (
                <GameCard key={`${game.home_team}-${game.away_team}`} game={game} />
              ))}
            </div>
          )}
        </div>

        {standings ? (
          <Standings east={standings.east} west={standings.west} overall={standings.overall} />
        ) : (
          <p className='text-sm text-[#C4554D]'>Could not load standings.</p>
        )}
      </div>
    </div>
  )
}
function GameCard({ game }: { game: Prediction }) {
  const home_pct = Math.round(game.home_win_prob * 100)
  const away_pct = 100 - home_pct

  const homeFavoured = game.implied_spread > 0
  const spreadLabel = homeFavoured
    ? `${game.home_team} - ${Math.abs(game.implied_spread)}`
    : `${game.away_team} - ${Math.abs(game.implied_spread)}`

  const modelSpreadLabel = homeFavoured
    ? `${game.home_team} - ${Math.abs(game.model_spread)}`
    : `${game.away_team} - ${Math.abs(game.model_spread)}`

  return (
    <div className='bg-[#1A1F2B] border border-[#2A3040] rounded-lg px-5 py-4 flex items-center justify-bewteen'>
      <TeamLine team={game.away_team} pct={away_pct} />
      <span className='Text-[8B93A6] text-sm px-3'></span>
      <TeamLine team={game.home_team} pct={home_pct} />
      <div className='flex flex-col gap-1'>
        <span className='text-sm text-[#8B93A6]'> Implicit spread:  {spreadLabel}</span>
        <span className='text-sm text-[#8B93A6]'> Model spread:  {modelSpreadLabel}</span>
      </div>
    </div>
  )
}
function TeamLine({
  team,
  pct,
  align = 'left',
}: {
  team: string
  pct: number
  align?: 'left' | 'right'
}) {
  return (
    <div className={`flex-1 flex items-baseline gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
      <span className='font-medium'> {team}</span>
      <span className='text-2xl font-semibold tabular-nums text-[#E8622C]'> {pct}%</span>
    </div>
  )
}

