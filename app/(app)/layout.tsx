'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  BarChart2, CalendarDays, Newspaper, Settings, LogOut, Menu, X, TrendingUp,
} from 'lucide-react'

const NAV = [
  { href: '/portfolio', label: 'Portfolio',     icon: TrendingUp   },
  { href: '/tracker',   label: 'Weekly Tracker', icon: CalendarDays },
  { href: '/news',      label: 'News',           icon: Newspaper    },
  { href: '/settings',  label: 'Settings',       icon: Settings     },
]

function NavItem({ href, label, icon: Icon, active, onClick }: {
  href: string; label: string; icon: React.ElementType; active: boolean; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all"
      style={{
        color: active ? 'var(--brand-accent)' : 'rgba(255,255,255,0.65)',
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <Icon size={16} strokeWidth={active ? 2.5 : 1.75} />
      {label}
    </Link>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const sidebar = (
    <div className="flex flex-col h-full" style={{ background: 'var(--brand-primary)' }}>
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: 'var(--brand-accent)', color: 'var(--brand-primary)' }}
        >
          HC
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: '#fff' }}>HC Platform</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Heeney Capital</div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href)}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm transition-all"
          style={{ color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)')}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0"
        style={{ width: 'var(--sidebar-w)' }}
      >
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex flex-col w-64 z-10">
            {sidebar}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              <X size={20} />
            </button>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div
          className="md:hidden flex items-center gap-3 px-4 py-3 shrink-0"
          style={{
            borderBottom: '1px solid var(--surface-border)',
            background: 'var(--surface-card)',
          }}
        >
          <button onClick={() => setMobileOpen(true)} style={{ color: 'var(--text-secondary)' }}>
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--brand-primary)' }}>
            HC Platform
          </span>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
