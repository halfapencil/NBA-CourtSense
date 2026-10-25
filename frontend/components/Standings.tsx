'use client'

import { useState } from "react"
import type { StandingRow } from "@/lib/teamStats"

export default function Standings({ east, west, overall, }: { east: StandingRow[]; west: StandingRow[]; overall: StandingRow[] }) {

    const [conf, setConf] = useState<'East' | 'West' | 'League'>('East')
    const rows = conf === 'East' ? east : conf === 'West' ? west : overall
    const showCutoffs = conf !== 'League'
    const showConf = conf === 'League'

    return (
        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-4">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Standings</h2>
                <div className="flex gap-1 text-xs">
                    {(['East', 'West', 'League'] as const).map((c) => (
                        <button
                            key={c}
                            onClick={() => setConf(c)}
                            className={`rounded px-2.5 py-1 ${conf === c ? "bg-[#E8984A] text-[#0E1016] font-semibold" : "text-[#8B93A6] hover:text-white"
                                }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            <table className="w-full text-sm tabular-nums">
                <thead>
                    <tr className="border-b border-[#2A3040] text-xs text-[#8B93A6]">
                        <th className="w-6 py-2 text-left">#</th>
                        <th className="py-2 text-left">Team</th>
                        {showConf && <th className="py-2 pl-3 text-left">Conf</th>}
                        <th className="py-2 text-right">W</th>
                        <th className="py-2 text-right">L</th>
                        <th className="py-2 text-right">PCT</th>
                        <th className="py-2 text-right">GB</th>
                        <th className="py-2 text-right">L10</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr
                            key={r.team}
                            className={`border-b ${showCutoffs && (i === 5 || i === 9) ? "border-[#8B93A6]/50" : "border-[#2A3040]/50"
                                }`}
                        >
                            <td className="py-1.5 text-[#8B93A6]">{i + 1}</td>
                            <td className="py-1.5 font-medium text-white">{r.team}</td>
                            {showConf && <td className="py-1.5 pl-3 text-left text-[#8B93A6]">{r.conference}</td>}
                            <td className="py-1.5 text-right text-white">{r.wins}</td>
                            <td className="py-1.5 text-right text-white">{r.losses}</td>
                            <td className="py-1.5 text-right text-[#8B93A6]">
                                {r.wins + r.losses > 0 ? r.pct.toFixed(3).replace(/^0/, '') : '-'}
                            </td>
                            <td className="py-1.5 text-right text-[#8B93A6]">{r.gb === 0 ? '-' : r.gb.toFixed(1)}</td>
                            <td className="py-1.5 text-right text-[#8B93A6]">{r.last10}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="mt-2 text-xs text-[#8B93A6]">
                {showCutoffs
                    ? "Sorted by win percentage. Lines mark the top 6 and the top 10. Official tiebreakers aren't applied."
                    : "All 30 teams by win percentage. Official tiebreakers aren't applied."}
            </p>
        </div>
    )
}
