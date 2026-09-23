'use client'

import { useRouter } from "next/navigation"
import { useRef } from "react"
import Link from "next/link"

export function DateNav({ currentStart }: { currentStart: string }) {
    const router = useRouter()
    const prev = shiftDate(currentStart, -5)
    const next = shiftDate(currentStart, 5)
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="flex gap-2">
            <Link href={`/games?start=${prev}`} className="px-3 py-1.5 text-sm border border-[#2A3040] rounded-md hover:border-[#3D5A80]">&larr;</Link>

            <input
                type="date"
                value={currentStart}
                onChange={(e) => router.push(`games?start=${e.target.value}`)}
                onClick={(e) => e.currentTarget.showPicker()}
                className="px-3 py-1.5 text-sm border border-[#2A3040] rounded-md hover:border-[#3D5A80]" />
            <Link href={`/games?start=${next}`} className="px-3 py-1.5 text-sm border border-[#2A3040] rounded-md hover:border-[#3D5A80]">&rarr;</Link>
        </div>
    )
}

function shiftDate(dateStr: string, days: number): string {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
}