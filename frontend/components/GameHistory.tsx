'use client'

import Link from "next/link"
import { TeamGameLogRow } from "@/lib/teamStats"

type HistoryRow = TeamGameLogRow & { record: string }

export default function GamesHistory({
    games,
    team,
}: {
    games: TeamGameLogRow[]
    team: string
}) {
    let w = 0
    let l = 0

    const rows: HistoryRow[] = games.map((g) => {
        if (g.win) w++
        else l++
        return { ...g, record: `${w}- ${l}` }
    }).reverse()

    return (
        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg p-4 min-[1700px]:max-h-[calc(100vh-4rem)] min-[1700px]:overflow-y-auto">
            <h2 className="text-base font-semibold text-white mb-3">Game history Regular Season</h2>
            <ul className="divide-y divide-[#2A3040]/60">
                {rows.map((g) => {
                    const date = String(g.game_date).slice(0, 10)
                    const slug = g.is_home
                        ? `${date}-${g.opponent}-${team}`
                        : `${date}-${team}-${g.opponent}`
                    return (
                        <li key={g.game_id}>
                            <Link
                                href={`/games/${slug}`}
                                className="flex items-center gap-3 py-2 text-sm hover:bg-[#0E1016]/60"
                            >
                                <span className="w-12 text-xs text-[#8B93A6] tabular-nums">
                                    {date.slice(5)}
                                </span>
                                <span
                                    className={`w-5 font-semibold ${g.win ? "text-[#5FA777]" : "text-[#C4554D]"}`}
                                >
                                    {g.win ? "W" : "L"}
                                </span>
                                <span className="flex-1 text-white">
                                    <span className="text-[#8B93A6]">{g.is_home ? "vs" : "@"}</span>{" "}
                                    {g.opponent}
                                </span>
                                <span className="tabular-nums text-white">
                                    {g.pts ?? "-"}-{g.opp_pts ?? "-"}
                                </span>
                                <span className="w-12 text-right text-xs text-[#8B93A6] tabular-nums">
                                    {g.record}
                                </span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}