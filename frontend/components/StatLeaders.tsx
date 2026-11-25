'use client'

import { useState } from "react"
import RankingTable, { RankColumn } from "@/components/RankingTable"
import { LEADER_STATS, TeamRating } from "@/lib/rankings"

// Stats where a HIGH number is bad for the team that records it
const BAD_WHEN_HIGH = new Set(['tov', 'pf'])

// A leaderboard with a stat picker.
//   side 'team': what each team averages per game
//   side 'opp':  what each team's opponents average against it
// Rank 1 is always the best outcome for the team: most points scored, fewest
// points allowed, fewest turnovers committed, most turnovers forced.
export default function StatLeaders({ title, side, rows, defaultStat }: {
    title: string
    side: 'team' | 'opp'
    rows: TeamRating[]
    defaultStat: string
}) {
    const [stat, setStat] = useState(defaultStat)
    const meta = LEADER_STATS.find((s) => s.key === stat) ?? LEADER_STATS[0]

    const highIsGoodForTeam = !BAD_WHEN_HIGH.has(meta.key)
    const better = (side === 'team') === highIsGoodForTeam ? 'high' : 'low'

    const columns: RankColumn[] = [{
        id: `${side}-${meta.key}`,
        label: `${meta.key.toUpperCase()}/G`,
        value: (r) => (side === 'team' ? r.perGame : r.oppPerGame)[meta.key],
        format: (v) => v.toFixed(1),
        better,
    }]

    const picker = (
        <select
            value={stat}
            onChange={(e) => setStat(e.target.value)}
            className="bg-[#0F131C] border border-[#2A3040] rounded-md px-2 py-1 text-sm"
        >
            {LEADER_STATS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
            ))}
        </select>
    )

    return (
        <RankingTable
            key={stat} // remount so the sort order resets when the stat changes
            title={title}
            subtitle={side === 'team'
                ? `${meta.label} per game by the team. Click the header to flip the order.`
                : `${meta.label} allowed per game by the team. Click the header to flip the order.`}
            rows={rows}
            columns={columns}
            headerRight={picker}
        />
    )
}