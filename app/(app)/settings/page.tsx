'use client'

import { useEffect, useState } from 'react'
import { Save, Eye, EyeOff, Calendar, Lock, CheckCircle } from 'lucide-react'

export default function SettingsPage() {
  const [icsUrl, setIcsUrl] = useState('')
  const [icsHint, setIcsHint] = useState('')
  const [icsConfigured, setIcsConfigured] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [showPasscode, setShowPasscode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => {
      setIcsConfigured(d.icsConfigured)
      setIcsHint(d.icsHint)
      setPasscode(d.passcode || '')
    })
  }, [])

  async function saveCalendar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icsUrl }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved('calendar')
      setIcsConfigured(!!icsUrl)
      setIcsHint(icsUrl ? icsUrl.slice(0, 40) + '…' : '')
      setIcsUrl('')
      setTimeout(() => setSaved(null), 3000)
    } else {
      setError((await res.json()).error)
    }
  }

  async function savePasscode(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved('passcode')
      setTimeout(() => setSaved(null), 3000)
    } else {
      setError((await res.json()).error)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Calendar integration and access control</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: 'var(--status-red)', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Calendar */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--surface-border)' }}>
          <Calendar size={16} style={{ color: 'var(--brand-primary)' }} />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Google Calendar</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Connect via secret iCal address — no sign-in required</p>
          </div>
          {icsConfigured && (
            <span className="ml-auto flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--status-green)' }}>
              <CheckCircle size={12} /> Connected
            </span>
          )}
        </div>
        <div className="p-5">
          {icsConfigured && (
            <p className="text-xs mb-4 p-3 rounded-lg" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              Current: {icsHint}
            </p>
          )}
          <form onSubmit={saveCalendar} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Secret iCal address
              </label>
              <input
                className="field-input"
                type="url"
                value={icsUrl}
                onChange={(e) => setIcsUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/ical/…"
              />
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Google Calendar → Settings → [Your calendar] → Integrate calendar → Secret address in iCal format
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !icsUrl}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--brand-primary)', color: '#fff' }}
              >
                {saved === 'calendar' ? <CheckCircle size={14} /> : <Save size={14} />}
                {saved === 'calendar' ? 'Saved!' : icsConfigured ? 'Update calendar' : 'Connect calendar'}
              </button>
              {icsConfigured && (
                <button
                  type="button"
                  onClick={() => { setIcsUrl(''); fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ icsUrl: '' }) }).then(() => { setIcsConfigured(false); setIcsHint('') }) }}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ border: '1px solid var(--surface-border)', color: 'var(--status-red)' }}
                >
                  Disconnect
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Passcode */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--surface-border)' }}>
          <Lock size={16} style={{ color: 'var(--brand-primary)' }} />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Access passcode</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>All users share a single passcode. Change it any time — everyone signs in again.</p>
          </div>
        </div>
        <div className="p-5">
          <form onSubmit={savePasscode} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Passcode</label>
              <div className="relative">
                <input
                  className="field-input pr-10"
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  minLength={6}
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode((x) => !x)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPasscode ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving || passcode.length < 6}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--brand-primary)', color: '#fff' }}
            >
              {saved === 'passcode' ? <CheckCircle size={14} /> : <Save size={14} />}
              {saved === 'passcode' ? 'Saved!' : 'Update passcode'}
            </button>
          </form>
        </div>
      </div>

      {/* About */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>About</h2>
        <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <p>Data is stored in Vercel Postgres. Nothing is sent externally except quote and news requests to Yahoo Finance, and calendar reads from Google.</p>
          <p>Quotes are delayed (~15 min) and cached for 2 minutes. News cached for 10 minutes. Calendar for 10 minutes.</p>
        </div>
      </div>
    </div>
  )
}
