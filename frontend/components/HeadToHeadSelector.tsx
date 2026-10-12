'use client'

import { useRouter } from "next/navigation"
import { NBA_TEAMS } from "@/lib/teamStats"

export default function HeadToHeadSelector({
    teamA,
    teamB,
    season,
}: {
    teamA: string
    teamB: string
    season: string
}) {
    const router = useRouter()

    const push = (next: { a?: string; b?: string; season?: string }) => {
        const params = new URLSearchParams({
            a: next.a ?? teamA,
            b: next.b ?? teamB,
            season: next.season ?? season,
        })
        router.push(`/teams/head-to-head?${params.toString()}`)
    }

    return (
        <div className="flex items-center gap-3">
            <select
                value={teamA}
                onChange={(e) => push({ a: e.target.value })}
                className="bg-[#1A1F2B] border border-[#2A3040] rounded-md px-3 py-2 text-sm"
            >
                {NBA_TEAMS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </select>

            <span className="text-[#8B93A6] text-sm">vs</span>

            <select
                value={teamB}
                onChange={(e) => push({ b: e.target.value })}
                className="bg-[#1A1F2B] border border-[#2A3040] rounded-md px-3 py-2 text-sm"
            >
                {NBA_TEAMS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </select>

            <select
                value={season}
                onChange={(e) => push({ season: e.target.value })}
                className="bg-[#1A1F2B] border border-[#2A3040] rounded-md px-3 py-2 text-sm"
            >
                {/* same season list source as your Teams page — see note below */}
            </select>
        </div>
    )
}