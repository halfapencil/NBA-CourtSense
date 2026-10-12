import { getTeamRoster } from "@/lib/playerStats";

export default async function PlayersPage() {
    const roster = await getTeamRoster("LAL", "2025-26")
    console.log(roster)
    return (
        <div>
            <h1>Players stats </h1>
        </div>
    )
}