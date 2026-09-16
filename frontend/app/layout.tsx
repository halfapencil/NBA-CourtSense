import "./globals.css"

export const metadata = {
  title: 'CourtSense',
  description: 'NBA game predictions and analysis'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <html lang="en">
      <body className="bg-[#0B0E14] text-[#F5F3EE]">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex -1 px-8 py-8">{children}</div>
        </div>
      </body>
    </html>
  )
}

function Sidebar() {
  const links = [
    { href: '/', label: 'Overview' },
    { href: '/games', label: 'Games' },
    { href: '/track-record', label: 'Track Record' },
    { href: '/methodology', label: 'Methodology' },
  ]

  return (
    <aside className="w-56 shrink-0 border-r border-[#2A3040] px-5 py-8">
      <div className="text-lg font-semibold mb-10">
        Court<span className="text-[#87CEEB]">Sense</span>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="px-3 py-2 rounded-md text-sm text-[#8B93A6] hover:text-[#F5F3EE] hover:bg-[#1A1F2B] transition-colors">
            {link.label}
          </a>
        ))}
      </nav>
    </aside >
  )
}