'use client'
import { getPlayerSeasonStats, getTeamRoster } from "@/lib/playerStats";
import { useState, useEffect } from "react";
import { NBA_TEAMS, getAvailableSeasons, seasonForDate } from "@/lib/teamStats";
export default function PlayersPage() {
    const [roster, setRoster] = useState<Awaited<ReturnType<typeof getTeamRoster>>>([])
    const [team, setTeam] = useState('BOS')

    const [seasons, setSeasons] = useState<string[]>([])
    const [season, setSeason] = useState(seasonForDate(new Date()))

    const [playerId, setPlayerId] = useState<number | null>(null)
    const [playerStats, setPlayerStats] = useState<Awaited<ReturnType<typeof getPlayerSeasonStats>>>(null)

    const [loadingRoster, setLoadingRoster] = useState(false)
    const [loadingStats, setLoadingStats] = useState(false)

    useEffect(() => {
        getAvailableSeasons(team).then((s) => {
            setSeasons(s)
            if (s.length && !s.includes(season)) setSeason(s[0])
        })
    }, [team])

    useEffect(() => {
        setLoadingRoster(true)
        setPlayerId(null)
        setPlayerStats(null)
        getTeamRoster(team, season).then((r) => {
            setRoster(r)
            setLoadingRoster(false)
        })
    }, [team, season])

    useEffect(() => {
        if (!playerId) {
            setPlayerStats(null)
            return
        }
        setLoadingStats(true)
        getPlayerSeasonStats(playerId, season).then((s) => {
            setPlayerStats(s)
            setLoadingStats(false)
        })
    }, [playerId, season])
    const selectedPlayerName = roster.find((p) => p.player_id === playerId)?.player_name
    return (
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
            <h1 className="text-2xl font-semibold">Players</h1>

            <div className="flex gap-3">
                <select
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    className="bg-[#1A1F2B] border border-[#2A3040] rounded-md px-3 py-2 text-sm [color-scheme:dark]"
                >
                    {NBA_TEAMS.map((t) => (
                        <option key={t} value={t} className="bg-[#1A1F2B] text-white">{t}</option>
                    ))}
                </select>

                <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="bg-[#1A1F2B] border border-[#2A3040] rounded-md px-3 py-2 text-sm [color-scheme:dark]"
                >
                    {seasons.map((s) => (
                        <option key={s} value={s} className="bg-[#1A1F2B] text-white">{s}</option>
                    ))}
                </select>

                <select
                    value={playerId ?? ''}
                    onChange={(e) => setPlayerId(e.target.value ? Number(e.target.value) : null)}
                    disabled={loadingRoster || roster.length === 0}
                    className="bg-[#1A1F2B] border border-[#2A3040] rounded-md px-3 py-2 text-sm [color-scheme:dark] disabled:opacity-50"
                >
                    <option value="">{loadingRoster ? 'Loading roster...' : 'Select a player'}</option>
                    {roster.map((p) => (
                        <option key={p.player_id} value={p.player_id} className="bg-[#1A1F2B] text-white">
                            {p.player_name}
                        </option>
                    ))}
                </select>
            </div>

            {loadingStats && <p className="text-[#8B93A6]">Loading stats...</p>}

            {!loadingStats && playerStats && (
                <div className="space-y-6">
                    {/* one row: identity, headline, shooting, discipline */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 ">
                        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-6 flex flex-col justify-center">
                            <h2 className="text-xl font-semibold">{selectedPlayerName}</h2>
                            <div className="text-sm text-[#8B93A6] mt-1">{team}</div>
                            <div className="text-sm text-[#8B93A6]">{playerStats.gamesPlayed} games, {season}</div>
                        </div>

                        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-6">
                            <h3 className="text-xs text-[#8B93A6] uppercase tracking-wide mb-3">Average</h3>
                            <div className="grid grid-cols-5 gap-x-2 gap-y-3 text-center">
                                {['pts', 'reb', 'ast', 'stl', 'blk'].map((c) => (
                                    <div key={c}>
                                        <div className="text-xs text-[#8B93A6] uppercase">{c}</div>
                                        <div className="text-lg font-semibold mt-0.5">{playerStats.averages[c].toFixed(1)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-6">
                            <h3 className="text-xs text-[#8B93A6] uppercase tracking-wide mb-3">Shooting</h3>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <div className="text-xs text-[#8B93A6]">FG</div>
                                    <div className="text-sm font-medium">
                                        {playerStats.averages.fgm.toFixed(1)}-{playerStats.averages.fga.toFixed(1)}
                                    </div>
                                    <div className="text-xs text-[#5FA777] mt-0.5">
                                        {playerStats.averages.fga > 0
                                            ? ((playerStats.averages.fgm / playerStats.averages.fga) * 100).toFixed(1) + '%'
                                            : '—'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-[#8B93A6]">3PT</div>
                                    <div className="text-sm font-medium">
                                        {playerStats.averages.fg3m.toFixed(1)}-{playerStats.averages.fg3a.toFixed(1)}
                                    </div>
                                    <div className="text-xs text-[#5FA777] mt-0.5">
                                        {playerStats.averages.fg3a > 0
                                            ? ((playerStats.averages.fg3m / playerStats.averages.fg3a) * 100).toFixed(1) + '%'
                                            : '—'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-[#8B93A6]">FT</div>
                                    <div className="text-sm font-medium">
                                        {playerStats.averages.ftm.toFixed(1)}-{playerStats.averages.fta.toFixed(1)}
                                    </div>
                                    <div className="text-xs text-[#5FA777] mt-0.5">
                                        {playerStats.averages.fta > 0
                                            ? ((playerStats.averages.ftm / playerStats.averages.fta) * 100).toFixed(1) + '%'
                                            : '—'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-6">
                            <h3 className="text-xs text-[#8B93A6] uppercase tracking-wide mb-3">Discipline</h3>
                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div>
                                    <div className="text-xs text-[#8B93A6]">TOV</div>
                                    <div className="text-lg font-semibold mt-0.5">{playerStats.averages.tov.toFixed(1)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-[#8B93A6]">PF</div>
                                    <div className="text-lg font-semibold mt-0.5">{playerStats.averages.pf.toFixed(1)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-6">
                            <h3 className="text-xs text-[#8B93A6] uppercase tracking-wide mb-3">Consistency</h3>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                {['pts', 'reb', 'ast'].map((c) => (
                                    <div key={c}>
                                        <div className="text-xs text-[#8B93A6] uppercase">stddev ±{c}</div>
                                        <div className="text-lg font-semibold mt-0.5">{playerStats.stddevs[c].toFixed(1)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-6">
                            <h3 className="text-xs text-[#8B93A6] uppercase tracking-wide mb-3">Game quality</h3>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="text-xs text-[#5FA777]">Exceptional</div>
                                    <div className="text-lg font-semibold mt-0.5">{playerStats.exceptionalGames}</div>
                                    <div className="text-xs text-[#8B93A6]">of {playerStats.gamesPlayed}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-[#C4554D]">Poor</div>
                                    <div className="text-lg font-semibold mt-0.5">{playerStats.poorGames}</div>
                                    <div className="text-xs text-[#8B93A6]">of {playerStats.gamesPlayed}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-6">
                            <h3 className="text-xs text-[#8B93A6] uppercase tracking-wide mb-3">P+R+A</h3>
                            <div className="text-center">
                                <div className="text-lg font-semibold">{playerStats.praMean.toFixed(1)} avg</div>
                                <div className="text-xs text-[#8B93A6] mt-1">{playerStats.highPraGames} big games (σ ≥ {1.5})</div>
                            </div>
                        </div>
                    </div>
                    {/* full-width trend graph below */}
                    {/* <PlayerTrendChart games={playerGameLog} /> */}
                </div>
            )}

            {!loadingStats && playerId && !playerStats && (
                <p className="text-[#8B93A6]">No stats found for {selectedPlayerName} in {season}.</p>
            )}
        </div>
    )
}