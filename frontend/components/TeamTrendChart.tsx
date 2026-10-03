'use client'

import { useState, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { TeamGameLogRow } from "@/lib/teamStats"

const CHARTABLE_STATS = ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fgm', 'fg3m']

function rollingAvg(values: number[], window: number): (number | null)[] {
    return values.map((_, i) => {
        if (i < window - 1) return null
        const slice = values.slice(i - window + 1, i + 1)
        return slice.reduce((a, b) => a + b, 0) / window
    })
}

function restColor(days: number | null): string {
    if (days === null) return '#8B93A6'
    if (days === 0) return '#C4554D'
    if (days === 1) return '#E8984A'
    return '#5FA777'
}

function TeamGameLogRowTooltip({ active, payload, label }: any) {
    if (!active || !payload || payload.length === 0) return null
    const point = payload[0].payload
    console.log(payload)
    const labelFor = (key: string) => {
        if (key === "value") return 'Team'
        if (key === "oppValue") return 'Opponent'
        if (key === "rollingAvg") return '5-game avg'
        return key
    }

    return (
        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg px-3 py-2 text-sm">
            <div className="text-[#8B93A6] mb-1">
                {label} {point.is_home !== undefined && (point.is_home ? 'vs' : '@')} {point.opponent}
            </div>
            {payload.map((entry: any) => (
                <div key={entry.dataKey} style={{ color: entry.color }}>
                    {labelFor(entry.dataKey)} : {entry.value}
                </div>
            ))}
        </div>
    )
}

export default function TeamTrendChart({ games }: { games: TeamGameLogRow[] }) {
    const [showOpponent, setShowOpponent] = useState(false)
    const [stat, setStat] = useState('pts')
    const chartData = useMemo(() => {
        const values = games.map((g) => g[stat] ?? 0)
        const rolling = rollingAvg(values, 5)
        return games.map((g, i) => ({
            date: g.game_date.slice(5),
            value: g[stat],
            oppValue: g[`opp_${stat}`],
            rollingAvg: rolling[i] !== null ? Number(rolling[i]!.toFixed(1)) : null,
            opponent: g.opponent,
            is_home: g.is_home,
            win: g.win,
            restDays: g.restDays,
        }))
    }, [games, stat])

    return (
        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium">Game-by-game trend</h2>
                <select
                    value={stat}
                    onChange={(e) => setStat(e.target.value)}
                    className="bg-[#0E1016] border border-[#2A3040] rounded-md px-2 py-1 text-sm"
                >
                    {CHARTABLE_STATS.map((s) => (
                        <option key={s} value={s}>{s.toUpperCase()}</option>
                    ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-[#8B93A6]">
                    <input
                        type="checkbox"
                        checked={showOpponent}
                        onChange={(e) => setShowOpponent(e.target.checked)}>
                    </input>
                    Show Opponent
                </label>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A3040" />
                    <XAxis dataKey="date" stroke="#8B93A6" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#8B93A6" tick={{ fontSize: 11 }} />
                    <Tooltip content={<TeamGameLogRowTooltip />}
                    />
                    {!showOpponent && (<><Line type="monotone" dataKey="value" stroke="#3D5A80" strokeWidth={1.5}
                        dot={(props: any) => {
                            const { cx, cy, payload } = props
                            return <circle cx={cx} cy={cy} r={3} fill={restColor(payload.restDays)} />
                        }} />
                        <Line type="monotone" dataKey="rollingAvg" stroke="#E8984A" strokeWidth={2} dot={false} />
                    </>
                    )}
                    {showOpponent && (
                        <Line type="monotone" dataKey="oppValue" stroke="#C4554D" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
                    )}

                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}