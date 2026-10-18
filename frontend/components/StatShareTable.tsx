'use client'

import { useMemo, useState } from "react"
import { SHARE_STATS, type PlayerStatShare, type ShareKey } from "@/lib/teamStats"

type SortKey = "name" | "gp" | ShareKey
const COLUMNS: { key: ShareKey; label: string }[] = [
    { key: "min", label: "MIN" },
    ...SHARE_STATS.map((s) => ({ key: s as ShareKey, label: s.toUpperCase() })),
    { key: "usg", label: "USG" },
]

const GP_OPTIONS = [1, 5, 10, 20]

function pct(v: number): string {
    return `${(v * 100).toFixed(1)}%`
}

export default function StatShareTable({
    players,
    team,
}: {
    players: PlayerStatShare[]
    team: string
}) {
    const [SortKey, setSortKey] = useState<SortKey>('min')
    const [desc, setDesc] = useState(true)
    const [minGp, setMinGp] = useState(1)

    const leaders = useMemo(() => {
        const max = {} as Record<ShareKey, number>
        for (const cols of COLUMNS) {
            let best = 0
            for (const p of players) {
                if (p.shares[cols.key] > best) best = p.shares[cols.key]
            }
            max[cols.key] = best
        }
        return max
    }, [players])

    const visible = useMemo(() => {
        const filtered = players.filter((p) => p.gp >= minGp)
        const dir = desc ? -1 : 1
        return [...filtered].sort((a, b) => {
            if (SortKey === 'name') return dir * a.name.localeCompare(b.name)
            if (SortKey === 'gp') return dir * (a.gp - b.gp)
            return dir * (a.shares[SortKey] - b.shares[SortKey])
        })
    }, [players, minGp, SortKey, desc])

    const hiddenShare = useMemo(() => {
        const shown = new Set(visible.map((p) => p.playerId))
        return players
            .filter((p) => !shown.has(p.playerId))
            .reduce((sum, p) => sum + p.shares.min, 0)
    }, [players, visible])

    function handleSort(key: SortKey) {
        if (key === SortKey) {
            setDesc(!desc)
        } else {
            setSortKey(key)
            setDesc(key !== "name")
        }
    }
    function arrow(key: SortKey) {
        if (key !== SortKey) return ""
        return desc ? " ▼" : " ▲"
    }
    if (players.length === 0) {
        return (
            <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-4 text-sm text-[#8B93A6]">
                No player box scores found for {team} in this season.
            </div>
        )

    }
    return (
        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-white">Stat share</h2>
                    <p className="text-xs text-[#8B93A6]">
                        Share of {team}&apos;s totals from games each player appeared in.
                        Box-score production only
                    </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-[#8B93A6]">
                    Min games played
                    <select
                        value={minGp}
                        onChange={(e) => setMinGp(Number(e.target.value))}
                        className="bg-[#0E1016] border border-[#2A3040] rounded px-2 py-1 text-white [color-scheme:dark]"
                    >
                        {GP_OPTIONS.map((n) => (
                            <option key={n} value={n}>{n}+</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] table-fixed text-sm">
                    <colgroup>
                        <col className="w-36" />
                        <col className="w-12" />
                        {COLUMNS.map((c) => (
                            <col key={c.key} className="w-24" />
                        ))}
                    </colgroup>
                    <thead>
                        <tr className="text-left text-xs text-[#8B93A6] border-b border-[#2A3040]">
                            <th className="py-2 pr-2 cursor-pointer" onClick={() => handleSort("name")}>
                                Player{arrow("name")}
                            </th>
                            <th className="py-2 text-right cursor-pointer" onClick={() => handleSort("gp")}>
                                GP{arrow("gp")}
                            </th>
                            {COLUMNS.map((c) => (
                                <th
                                    key={c.key}
                                    className="py-2 pl-2 text-right cursor-pointer"
                                    onClick={() => handleSort(c.key)}
                                >
                                    {c.label}{arrow(c.key)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((p) => (
                            <tr key={p.playerId} className="border-b border-[#2A3040]/60">
                                <td className="py-1.5 pr-2 text-white truncate">{p.name}</td>
                                <td className="py-1.5 text-right text-[#8B93A6]">{p.gp}</td>
                                {COLUMNS.map((c) => {
                                    const v = p.shares[c.key]
                                    const isLeader = leaders[c.key] > 0 && v === leaders[c.key]
                                    const widthPct = leaders[c.key] > 0 ? (v / leaders[c.key]) * 100 : 0
                                    return (
                                        <td key={c.key} className="py-1.5 pl-2">
                                            <div className="relative h-6 overflow-hidden rounded bg-[#0E1016]">
                                                <div
                                                    className="absolute inset-y-0 left-0 bg-[#E8984A]/25"
                                                    style={{ width: `${widthPct}%` }}
                                                />
                                                <span
                                                    className={`relative z-10 flex h-full items-center justify-end px-2 tabular-nums ${isLeader ? "font-semibold text-[#5FA777]" : "text-white"
                                                        }`}
                                                >
                                                    {pct(v)}
                                                </span>
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {hiddenShare > 0.0005 && (
                <p className="mt-2 text-xs text-[#8B93A6]">
                    Hidden players account for {pct(hiddenShare)} of team minutes, so visible shares
                    sum to less than 100%.
                </p>
            )}
            <p className="mt-1 text-xs text-[#8B93A6]">
                USG = (FGA + 0.44 × FTA + TOV) share. Bars are scaled to the column leader.
            </p>
        </div>
    )
}

