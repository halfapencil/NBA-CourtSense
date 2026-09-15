import { supabase } from '@/lib/supabase';

type Prediction = {
  game_date: string
  home_team: string
  away_team: string
  home_win_prob: number
}

async function getTodaysPredictions(): Promise<Prediction[]> {

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('predictions')
    .select("game_date, home_team, away_team, home_win_prob")
    .eq("game_date", "2025-01-15")
    .order("home_win_prob", { ascending: false })

  if (error) {
    console.error("Failed to load predictions", error)
    return []
  }

  return data ?? []
}

export default async function Home() {
  const predictions = await getTodaysPredictions()
  //const date = new Date().toISOString().split("T")[0]
  const date = '2025-01-15';
  return (
    <main className="min-h-screen bg-[#0B0E14] text-[#F5F3EE] px-6 py-12">
      <div className='max-w-2xl mx-auto'>
        <h1 className='text-3xl font-semibold mb-8'>NBA Predictions for {date}</h1>
        {predictions.length === 0 ?
          (<p className='text-[#8B923A6]'> No games scheduled today, or predictions are not available</p>) : (
            <div className='space-y-3'>
              {predictions.map((game) => (
                <GameCard key={`${game.home_team} - ${game.away_team}`} game={game} />
              ))}
            </div>)}
      </div>
    </main>
  )
}

function GameCard({ game }: { game: Prediction }) {
  const home_pct = Math.round(game.home_win_prob * 100)
  const away_pct = 100 - home_pct
  return (
    <div className='bg-[#1A1F2B] border border-[#2A3040] rounded-lg px-5 py-4 flex items-center justify-bewteen'>
      <TeamLine team={game.away_team} pct={away_pct} />
      <span className='Text-[8B93A6] text-sm px-3'></span>
      <TeamLine team={game.home_team} pct={home_pct} />
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