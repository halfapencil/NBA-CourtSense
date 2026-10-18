'use client'

import { useState, useEffect } from "react"
import { getTeamSeasonStats, getAvailableSeasons, seasonForDate, NBA_TEAMS, STAT_COLS, TeamGameLogRow, getTeamGameLog, getTeamStatShare, PlayerStatShare } from "@/lib/teamStats"
import TeamTrendChart from "@/components/TeamTrendChart"
import StatShareTable from "@/components/StatShareTable"
import GamesHistory from "@/components/GameHistory"

export default function TeamsPage() {
    const [team, setTeam] = useState('BOS')
    const [seasons, setSeasons] = useState<string[]>([])
    const [season, setSeason] = useState(seasonForDate(new Date()))
    const [stats, setStats] = useState<Awaited<ReturnType<typeof getTeamSeasonStats>>>(null)
    const [loading, setLoading] = useState(false)
    const [games, setGames] = useState<TeamGameLogRow[]>([])

    const [shares, setShares] = useState<PlayerStatShare[]>([])
    const [sharesError, setSharesError] = useState<string | null>(null)
    useEffect(() => {
        getAvailableSeasons(team).then((s) => {
            setSeasons(s)
            if (s.length && !s.includes(season)) setSeason(s[0])
        })
    }, [team])

    useEffect(() => {
        setLoading(true)
        let cancelled = false
        Promise.all([
            getTeamSeasonStats(team, season),
            getTeamGameLog(team, season),
            getTeamStatShare(team, season)
        ]).then(([s, g, sh]) => {
            setStats(s)
            setGames(g)
            setShares(sh?.players ?? [])
            setSharesError(sh ? null : 'Could not load share')
            setLoading(false)
        })
        return () => { cancelled = true }
    }, [team, season])
    return (
        <div className="max-w-6xl min-[1700px]:max-w-[1500px] mx-auto px-6 py-8 space-y-6">
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

            <div className="grid gap-6 min-[1700px]:grid-cols-[minmax(0,1fr)_320px] items-start">
                <div className="space-y-6 min-w-0">
                    {!loading && stats && (
                        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-6 space-y-4">
                            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                                <span className="text-3xl font-semibold">{stats.wins}-{stats.losses}</span>
                                <span className="text-sm text-[#8B93A6]">
                                    Home <span className="text-white font-medium">{stats.homeWin}-{stats.homeLoss}</span>
                                </span>
                                <span className="text-sm text-[#8B93A6]">
                                    Away <span className="text-white font-medium">{stats.awayWin}-{stats.awayLoss}</span>
                                </span>
                                <span className="text-sm text-[#8B93A6]">{stats.gamesPlayed} games, through {stats.lastGameDate}</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[#8B93A6] text-left border-b border-[#2A3040]">
                                            <th className="py-2"></th>
                                            {STAT_COLS.map((c) => (
                                                <th key={c} className="px-2 py-2 text-center uppercase font-medium">{c}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-[#2A3040]/50">
                                            <td className="py-2 pr-3 text-[#8B93A6] whitespace-nowrap">{team}</td>
                                            {STAT_COLS.map((c) => (
                                                <td key={c} className="px-3 py-2 text-center font-medium">
                                                    {stats.averages[c].toFixed(1)}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-3 text-[#8B93A6] whitespace-nowrap">Opponent</td>
                                            {STAT_COLS.map((c) => (
                                                <td key={c} className="px-3 py-2 text-center text-[#8B93A6]">
                                                    {stats.oppAverages[c].toFixed(1)}
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!loading && !stats && (
                        <p className="text-[#8B93A6]">No games found for {team} in {season}.</p>
                    )}

                    {!loading && games.length > 0 && <TeamTrendChart games={games} />}

                    {!loading && sharesError && (
                        <p className="text-[#C4554D] text-sm">{sharesError}</p>
                    )}
                    {!loading && !sharesError && stats && (
                        <StatShareTable players={shares} team={team} />
                    )}
                </div>

                {!loading && games.length > 0 && <GamesHistory games={games} team={team} />}
            </div>
        </div>
    )
}