export function StatCard({ label, value, sublabel }: {
    label: string, value: string, sublabel?: string
}) {
    return (
        <div className="bg-[#1A1F2B] border border-[#2A3040] rounded-lg px-5 py-4">
            <div className="text-sm text-[#8B93A6] mb-1"> {label}</div>
            <div className="text-3xl font-semiobold tabular-nums"> {value}</div>
            {sublabel && <div className="text-xs text-[#8B93A6] mt-1 ">{sublabel}</div>}
        </div>
    )
}