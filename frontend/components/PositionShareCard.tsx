'use client'
import { useState } from "react"
import { PositionAgg, POS_STAT_KEYS, PosStatKey } from "@/lib/teamStats"

const LABELS = { G: 'Guards', F: 'Forwards', C: 'Centers', BENCH: 'Bench' }
type Mode = 'avg' | 'share' | 'delta'

export default function PositionShareCard({ team, opp, teamLabel, recentN = 10 }: {
    team: PositionAgg[]; opp: PositionAgg[] | null; teamLabel: string; recentN?: number
}) {
    const [side, setSide] = useState<'team' | 'opp'>('team')
    const [mode, setMode] = useState<Mode>('avg')
    const data = side === 'opp' && opp ? opp : team

    const cell = (d: PositionAgg, k: PosStatKey) => {
        if (mode === 'avg') return d.avg[k].toFixed(1)
        if (mode === 'share') return `${(d.share[k] * 100).toFixed(0)}%`
        const delta = (d.recentShare[k] - d.share[k]) * 100
        return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`
    }

    const deltaColor = (d: PositionAgg, k: PosStatKey) => {
        if (mode !== 'delta') return ''
        const delta = d.recentShare[k] - d.share[k]
        if (Math.abs(delta) < 0.005) return 'text-[#8B93A6]'
        return delta > 0 ? 'text-[#4CAF7A]' : 'text-[#C4554D]'
    }

    const teamTotal = (k: PosStatKey) => data.reduce((s, d) => s + d.avg[k], 0)

    return (
        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">Production by position</h2>

                <div className="flex flex-wrap gap-3">
                    {/* side toggle */}
                    <div className="flex gap-1 text-xs">
                        {([['team', teamLabel], ['opp', 'Opponents']] as const).map(([s, label]) => (
                            <button
                                key={s}
                                disabled={s === 'opp' && !opp}
                                onClick={() => setSide(s)}
                                className={`px-2.5 py-1 rounded-md border disabled:opacity-40 disabled:cursor-not-allowed ${side === s ? 'bg-[#2A3040] border-[#3A4258] text-white' : 'border-[#2A3040] text-[#8B93A6]'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* mode toggle */}
                    <div className="flex gap-1 text-xs">
                        {([['avg', 'Per game'], ['share', 'Share'], ['delta', `Last ${recentN} Δ`]] as [Mode, string][]).map(([m, label]) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`px-2.5 py-1 rounded-md border ${mode === m ? 'bg-[#2A3040] border-[#3A4258] text-white' : 'border-[#2A3040] text-[#8B93A6]'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-[#8B93A6] text-left border-b border-[#2A3040]">
                            <th className="py-2"></th>
                            {POS_STAT_KEYS.map((k) => (
                                <th key={k} className="px-2 py-2 text-center uppercase font-medium">{k}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((d) => (
                            <tr key={d.pos} className="border-b border-[#2A3040]/50">
                                <td className="py-2 pr-3 text-[#8B93A6] whitespace-nowrap">{LABELS[d.pos]}</td>
                                {POS_STAT_KEYS.map((k) => (
                                    <td key={k} className={`px-2 py-2 text-center ${deltaColor(d, k)}`}>{cell(d, k)}</td>
                                ))}
                            </tr>
                        ))}
                        {mode === 'avg' && (
                            <tr>
                                <td className="py-2 pr-3 font-medium">{side === 'team' ? teamLabel : 'Opp'}</td>
                                {POS_STAT_KEYS.map((k) => (
                                    <td key={k} className="px-2 py-2 text-center font-medium">{teamTotal(k).toFixed(1)}</td>
                                ))}
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}