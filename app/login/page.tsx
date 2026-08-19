'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      if (res.ok) {
        router.push('/portfolio')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Sign-in failed')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--brand-primary)' }}>
      <div className="w-full max-w-sm">
        {/* Logo tile */}
        <div className="flex justify-center mb-8">
          <div
            className="w-16 h-16 rounded-xl flex flex-col items-center justify-center text-center text-xs font-semibold tracking-widest uppercase"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--brand-accent)',
              letterSpacing: '0.1em',
              lineHeight: '1.2',
            }}
          >
            <span>HC</span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl p-8"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <h1
            className="text-2xl font-medium text-center mb-1"
            style={{ color: '#fff', letterSpacing: '0.02em' }}
          >
            HC Platform
          </h1>
          <p
            className="text-center text-xs mb-8 tracking-widest uppercase"
            style={{ color: 'var(--brand-accent)' }}
          >
            Heeney Capital
          </p>

          <div className="space-y-3">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Passcode"
              autoFocus
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-lg text-center text-base outline-none transition-all"
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                letterSpacing: '0.1em',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand-accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
            />

            <button
              type="submit"
              disabled={loading || !passcode}
              className="w-full py-3 rounded-lg font-semibold text-sm tracking-wide transition-all disabled:opacity-50"
              style={{
                background: 'var(--brand-accent)',
                color: 'var(--brand-primary)',
                letterSpacing: '0.04em',
              }}
            >
              {loading ? 'Signing in…' : 'Enter'}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm" style={{ color: '#f87171' }}>
              {error}
            </p>
          )}
        </form>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Contact your administrator for access
        </p>
      </div>
    </div>
  )
}
