import type { TeamTravel } from "@/lib/travelContext"

// One small line for a team in a game card: "1d rest · 840 mi · border"
export default function TravelLine({ travel }: { travel?: TeamTravel }) {
    if (!travel || travel.restDays === null) return null

    const miles = travel.travelMiles ? Math.round(travel.travelMiles).toLocaleString() : null

    return (
        <div className="text-xs text-[#8B93A6] whitespace-nowrap">
            {travel.restDays === 0
                ? <span className="text-[#C4554D]">Back-to-back</span>
                : `${travel.restDays}d rest`}
            {miles && ` · ${miles} mi`}
            {travel.crossedBorder && ' · border'}
        </div>
    )
}