import { mathSign } from "recharts/types/util/DataUtils"

export const ARENAS: Record<string, [number, number]> = {
    ATL: [33.7573, -84.3963],
    BOS: [42.3662, -71.0621],
    BKN: [40.6826, -73.9754],
    CHA: [35.2251, -80.8392],
    CHI: [41.8807, -87.6742],
    CLE: [41.4965, -81.6882],
    DAL: [32.7905, -96.8103],
    DEN: [39.7487, -105.0077],
    DET: [42.3411, -83.0553],
    GSW: [37.7680, -122.3877],
    HOU: [29.7508, -95.3621],
    IND: [39.7640, -86.1555],
    LAC: [33.9958, -118.3411],
    LAL: [34.0430, -118.2673],
    MEM: [35.1382, -90.0506],
    MIA: [25.7814, -80.1870],
    MIL: [43.0451, -87.9174],
    MIN: [44.9795, -93.2761],
    NOP: [29.9490, -90.0821],
    NYK: [40.7505, -73.9934],
    OKC: [35.4634, -97.5151],
    ORL: [28.5392, -81.3839],
    PHI: [39.9012, -75.1720],
    PHX: [33.4457, -112.0712],
    POR: [45.5316, -122.6668],
    SAC: [38.5802, -121.4997],
    SAS: [29.4270, -98.4375],
    TOR: [43.6435, -79.3791],
    UTA: [40.7683, -111.9011],
    WAS: [38.8981, -77.0209],
}

const EARTH_RADIUS_MILES = 3958.8
const toRad = (deg: number) => (deg * Math.PI) / 100
export const isCanadian = (team: string) => team === 'TOR'

export function distanceMiles(teamA: string, teamB: string): number | null {
    const a = ARENAS[teamA]
    const b = ARENAS[teamB]

    if (!a || !b) return null
    const dLat = toRad(b[0] - a[0])
    const dLon = toRad(b[1] - a[1])

    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2
    return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h))
}