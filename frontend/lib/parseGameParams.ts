export function parseGameParams(param: string) {
    const match = /^(\d{4}-\d{2}-\d{2})-([A-Z]{3})-([A-Z]{3})$/.exec(param)
    if (!match) return null
    const [, date, away, home] = match
    return { date, away, home }

}