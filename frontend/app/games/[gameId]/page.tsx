import { notFound } from "next/navigation"
import { parseGameParams } from "@/lib/parseGameParams"
import { getGame } from "@/lib/queries"
export default async function GamePage({
    params,
}: {
    params: Promise<{ gameId: string }>
}) {
    const { gameId } = await params
    const parsed = parseGameParams(gameId)
    if (!parsed) notFound()

    console.log(await getGame(parsed))

    // if (!prediciton && !game) notFound()
    return <h1 className="text-2xl font-semibold"> Game {gameId} </h1>
}