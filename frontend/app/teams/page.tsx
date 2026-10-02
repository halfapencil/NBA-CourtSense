'use client'

import { useState, useEffect } from "react"
import { getTeamSeasonStats, getAvailableSeasons, seasonForDate, NBA_TEAMS, STAT_COLS } from "@/lib/teamStats"
export default function TeamsPage() {
    const [team, setTeam] = useState('BOS')
    const [seasons, setSeasons] = useState<string[]>([])
    const [season, setSeason] = useState(seasonForDate(new Date()))
    const [stats, setStats] = useState<Awaited<ReturnType<typeof getTeamSeasonStats>>>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        getAvailableSeasons(team).then((s) => {
            setSeasons(s)
            if (s.length && !s.includes(season)) setSeason(s[0])
        })
    }, [team])

    useEffect(() => {
        setLoading(true)
        getTeamSeasonStats(team, season).then((s) => {
            setStats(s)
            setLoading(false)
        })
    }, [team, season])
    return (
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
            <h1 className="text-2xl font-semibold">Teams</h1>

            <div className="flex gap-3">
                <select
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    className="bg-[#1A1F2B] border border-[#2A3040] rounded-md px-3 py-2 text-sm"
                >
                    {NBA_TEAMS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>

                <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="bg-[#1A1F2B] border border-[#2A3040] rounded-md px-3 py-2 text-sm"
                >
                    {seasons.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>

            {loading && <p className="text-[#8B93A6]">Loading...</p>}

            {!loading && stats && (
                <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-6 space-y-4">
                    <div className="flex items-baseline gap-4">
                        <span className="text-3xl font-semibold">{stats.wins}-{stats.losses}</span>
                        <span className="text-sm text-[#8B93A6]">{stats.gamesPlayed} games, through {stats.lastGameDate}</span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-4 text-center">
                        {STAT_COLS.map((c) => (
                            <div key={c}>
                                <div className="text-xs text-[#8B93A6] uppercase">{c}</div>
                                <div className="text-lg font-medium">{stats.averages[c].toFixed(1)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!loading && !stats && (
                <p className="text-[#8B93A6]">No games found for {team} in {season}.</p>
            )}
        </div>
    )
}