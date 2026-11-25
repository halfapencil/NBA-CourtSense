'use client'

import { useState, ReactNode } from "react"
import type { TeamRating } from "@/lib/rankings"

export type RankColumn = {
    id: string
    label: string
    value: (r: TeamRating) => number
    format: (v: number) => string
    better: 'high' | 'low'   // which end of the scale ranks first
}

// A leaderboard card. The first column is the default sort; click a header to
// sort by it, click again to flip the order. `headerRight` is for controls
// such as a stat picker.
export default function RankingTable({ title, subtitle, rows, columns, headerRight }: {
    title: string
    subtitle?: string
    rows: TeamRating[]
    columns: RankColumn[]
    headerRight?: ReactNode
}) {
    const [sort, setSort] = useState<{ id: string; worstFirst: boolean }>({
        id: columns[0].id,
        worstFirst: false,
    })

    const col = columns.find((c) => c.id === sort.id) ?? columns[0]

    const sorted = [...rows].sort((a, b) => {
        const best = col.better === 'high' ? col.value(b) - col.value(a) : col.value(a) - col.value(b)
        return (sort.worstFirst ? -best : best) || a.team.localeCompare(b.team)
    })

    const onHeaderClick = (id: string) =>
        setSort((s) => (s.id === id ? { id, worstFirst: !s.worstFirst } : { id, worstFirst: false }))

    return (
        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-6 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 className="text-lg font-semibold">{title}</h2>
                    {subtitle && <p className="text-xs text-[#8B93A6] mt-1">{subtitle}</p>}
                </div>
                {headerRight}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-[#8B93A6] text-left border-b border-[#2A3040]">
                            <th className="py-2 pr-2 w-8">#</th>
                            <th className="py-2">Team</th>
                            <th className="px-2 py-2 text-center">GP</th>
                            {columns.map((c) => (
                                <th
                                    key={c.id}
                                    onClick={() => onHeaderClick(c.id)}
                                    className={`px-2 py-2 text-center font-medium cursor-pointer select-none whitespace-nowrap ${col.id === c.id ? 'text-white' : ''}`}
                                >
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((r, i) => (
                            <tr key={r.team} className="border-b border-[#2A3040]/50">
                                <td className="py-2 pr-2 text-[#8B93A6]">{i + 1}</td>
                                <td className="py-2 font-medium">{r.team}</td>
                                <td className="px-2 py-2 text-center text-[#8B93A6]">{r.gp}</td>
                                {columns.map((c) => (
                                    <td
                                        key={c.id}
                                        className={`px-2 py-2 text-center ${col.id === c.id ? 'text-white font-medium' : 'text-[#8B93A6]'}`}
                                    >
                                        {c.format(c.value(r))}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}