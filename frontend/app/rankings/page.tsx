'use client'

import { useState, useEffect } from "react"
import { getAvailableSeasons, seasonForDate } from "@/lib/teamStats"
import { getTeamRatings, TeamRating } from "@/lib/rankings"
import RankingTable, { RankColumn } from "@/components/RankingTable"
import StatLeaders from "@/components/StatLeaders"

const one = (v: number) => v.toFixed(1)
const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const OFFENSE: RankColumn[] = [
    { id: 'ortg', label: 'ORtg', value: (r) => r.ortg, format: one, better: 'high' },
    { id: 'ppg', label: 'PPG', value: (r) => r.perGame.pts, format: one, better: 'high' },
    { id: 'efg', label: 'eFG%', value: (r) => r.efg, format: pct, better: 'high' },
    { id: 'tovPct', label: 'TOV%', value: (r) => r.tovPct, format: pct, better: 'low' },
]

const DEFENSE: RankColumn[] = [
    { id: 'drtg', label: 'DRtg', value: (r) => r.drtg, format: one, better: 'low' },
    { id: 'oppPpg', label: 'Opp PPG', value: (r) => r.oppPerGame.pts, format: one, better: 'low' },
    { id: 'oppEfg', label: 'Opp eFG%', value: (r) => r.oppEfg, format: pct, better: 'low' },
    { id: 'oppTovPct', label: 'Forced TOV%', value: (r) => r.oppTovPct, format: pct, better: 'high' },
]

export default function RankingsPage() {
    const [seasons, setSeasons] = useState<string[]>([])
    const [season, setSeason] = useState(seasonForDate(new Date()))
    const [ratings, setRatings] = useState<TeamRating[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        getAvailableSeasons().then((s) => {
            setSeasons(s)
            if (s.length && !s.includes(season)) setSeason(s[0])
        })
    }, [])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)
        getTeamRatings(season)
            .then((r) => { if (!cancelled) setRatings(r) })
            .catch((e) => {
                console.error('getTeamRatings', e)
                if (!cancelled) setError('Could not load rankings')
            })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [season])
    console.log(ratings.find((r) => r.team === 'BOS'))
    return (
        <div className="max-w-6xl min-[1700px]:max-w-[1500px] mx-auto px-6 py-8 space-y-6">
            <h1 className="text-2xl font-semibold">Rankings</h1>

            <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="bg-[#1A1F2B] border border-[#2A3040] rounded-md px-3 py-2 text-sm"
            >
                {seasons.map((s) => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>

            {loading && <p className="text-[#8B93A6]">Loading...</p>}
            {!loading && error && <p className="text-[#C4554D] text-sm">{error}</p>}
            {!loading && !error && ratings.length === 0 && (
                <p className="text-[#8B93A6]">No games found for {season}.</p>
            )}

            {!loading && ratings.length > 0 && (
                <div className="grid gap-6 xl:grid-cols-2 items-start">
                    <RankingTable
                        title="Offense"
                        subtitle="Points scored per 100 possessions. Click a column to re-rank."
                        rows={ratings}
                        columns={OFFENSE}
                    />
                    <RankingTable
                        title="Defense"
                        subtitle="Points allowed per 100 possessions, lowest first. Click a column to re-rank."
                        rows={ratings}
                        columns={DEFENSE}
                    />
                    <StatLeaders title="Team stat leaders" side="team" rows={ratings} defaultStat="reb" />
                    <StatLeaders title="Opponent stat leaders" side="opp" rows={ratings} defaultStat="ast" />
                </div>
            )}
        </div>
    )
}