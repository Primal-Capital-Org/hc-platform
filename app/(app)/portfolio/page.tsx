'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, TrendingUp, TrendingDown, Edit2, Trash2, X, DollarSign } from 'lucide-react'
import type { Holding } from '@/lib/db'
import type { QuoteResult } from '@/lib/yahoo'

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  if (!data || data.length < 2) return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 80, h = 28
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
  const color = up ? 'var(--status-green)' : 'var(--status-red)'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts.join(' ')} stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtCcy(n: number | null | undefined, ccy = 'USD') {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n)
}
function fmtPct(n: number | null | undefined) {
  if (n == null) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function HoldingModal({
  holding, onClose, onSave,
}: {
  holding?: Partial<Holding>; onClose: () => void; onSave: (h: Partial<Holding>) => Promise<void>
}) {
  const [form, setForm] = useState<Partial<Holding>>(holding ?? { type: 'public' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: keyof Holding, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    try { await onSave(form) } catch (e) { setErr(String(e)) } finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="w-full max-w-md rounded-xl p-6 animate-fade-in"
        style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            {holding?.id ? 'Edit holding' : 'Add holding'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--surface-border)' }}>
            {(['public', 'private'] as const).map((t) => (
              <button
                key={t} type="button" onClick={() => set('type', t)}
                className="flex-1 py-2 text-sm font-medium capitalize transition-all"
                style={{
                  background: form.type === t ? 'var(--brand-primary)' : 'transparent',
                  color: form.type === t ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {form.type === 'public' ? (
            <>
              <Field label="Ticker" required>
                <input className="field-input" value={form.ticker ?? ''} onChange={(e) => set('ticker', e.target.value.toUpperCase())} placeholder="AAPL" required />
              </Field>
              <Field label="Name (optional)">
                <input className="field-input" value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="Apple Inc." />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity" required>
                  <input className="field-input" type="number" min="0" step="any" value={form.quantity ?? ''} onChange={(e) => set('quantity', e.target.value)} required />
                </Field>
                <Field label="Avg cost" required>
                  <input className="field-input" type="number" min="0" step="any" value={form.avg_cost ?? ''} onChange={(e) => set('avg_cost', e.target.value)} required />
                </Field>
              </div>
            </>
          ) : (
            <>
              <Field label="Name" required>
                <input className="field-input" value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="Project Falcon" required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost basis ($)" required>
                  <input className="field-input" type="number" min="0" step="any" value={form.cost_total ?? ''} onChange={(e) => set('cost_total', e.target.value)} required />
                </Field>
                <Field label="Current value ($)" required>
                  <input className="field-input" type="number" min="0" step="any" value={form.current_value ?? ''} onChange={(e) => set('current_value', e.target.value)} required />
                </Field>
              </div>
              <Field label="Valuation date">
                <input className="field-input" type="date" value={form.valuation_date ?? ''} onChange={(e) => set('valuation_date', e.target.value)} />
              </Field>
            </>
          )}

          {err && <p className="text-sm" style={{ color: 'var(--status-red)' }}>{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--brand-primary)', color: '#fff' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: 'var(--status-red)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; holding?: Partial<Holding> }>({ open: false })

  const loadData = useCallback(async () => {
    const [hRes, qRes] = await Promise.all([fetch('/api/portfolio'), fetch('/api/quotes')])
    setHoldings(await hRes.json())
    setQuotes(await qRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function refresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  async function saveHolding(form: Partial<Holding>) {
    const method = form.id ? 'PUT' : 'POST'
    const url = form.id ? `/api/portfolio/${form.id}` : '/api/portfolio'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (!res.ok) throw new Error((await res.json()).error)
    await loadData()
    setModal({ open: false })
  }

  async function deleteHolding(id: string) {
    if (!confirm('Remove this holding?')) return
    await fetch(`/api/portfolio/${id}`, { method: 'DELETE' })
    setHoldings((h) => h.filter((x) => x.id !== id))
  }

  // Calculations
  const publicHoldings = holdings.filter((h) => h.type === 'public')
  const privateHoldings = holdings.filter((h) => h.type === 'private')

  let totalValue = 0, totalCost = 0, totalDayPnl = 0
  for (const h of publicHoldings) {
    const q = quotes[h.ticker!]
    if (q?.price != null && h.quantity != null) {
      const val = q.price * h.quantity
      const cost = (h.avg_cost ?? 0) * h.quantity
      totalValue += val
      totalCost += cost
      if (q.prevClose != null) totalDayPnl += (q.price - q.prevClose) * h.quantity
    }
  }
  for (const h of privateHoldings) {
    totalValue += h.current_value ?? 0
    totalCost += h.cost_total ?? 0
  }
  const totalPnl = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
  const dayPnlPct = totalValue - totalDayPnl > 0 ? (totalDayPnl / (totalValue - totalDayPnl)) * 100 : 0

  if (loading) return <LoadingScreen />

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Portfolio</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Live public + private holdings</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', background: 'var(--surface-card)' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--brand-primary)', color: '#fff' }}
          >
            <Plus size={14} />
            Add holding
          </button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Total value" value={fmtCcy(totalValue)} />
        <StatTile
          label="Total P&L"
          value={fmtCcy(totalPnl)}
          sub={fmtPct(totalPnlPct)}
          positive={totalPnl >= 0}
        />
        <StatTile
          label="Day P&L"
          value={fmtCcy(totalDayPnl)}
          sub={fmtPct(dayPnlPct)}
          positive={totalDayPnl >= 0}
        />
        <StatTile label="Positions" value={String(holdings.length)} sub={`${publicHoldings.length} public · ${privateHoldings.length} private`} />
      </div>

      {/* Public holdings */}
      {publicHoldings.length > 0 && (
        <Section title="Public equities">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Name</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Day chg</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Avg cost</th>
                  <th className="text-right">Value</th>
                  <th className="text-right">P&L</th>
                  <th>Trend</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {publicHoldings.map((h) => {
                  const q = quotes[h.ticker!]
                  const value = q?.price != null && h.quantity != null ? q.price * h.quantity : null
                  const cost  = h.avg_cost != null && h.quantity != null ? h.avg_cost * h.quantity : null
                  const pnl   = value != null && cost != null ? value - cost : null
                  const pnlPct = cost ? ((pnl ?? 0) / cost) * 100 : null
                  const dayChg = q?.price != null && q.prevClose != null ? ((q.price - q.prevClose) / q.prevClose) * 100 : null
                  const up = (pnl ?? 0) >= 0
                  return (
                    <tr key={h.id}>
                      <td>
                        <span className="font-mono font-semibold text-sm" style={{ color: 'var(--brand-primary)' }}>
                          {h.ticker}
                        </span>
                      </td>
                      <td className="text-sm" style={{ color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {q?.name || h.name || h.ticker}
                      </td>
                      <td className="text-right font-medium">{fmt(q?.price)}</td>
                      <td className="text-right">
                        <span className="text-sm font-medium" style={{ color: (dayChg ?? 0) >= 0 ? 'var(--status-green)' : 'var(--status-red)' }}>
                          {fmtPct(dayChg)}
                        </span>
                      </td>
                      <td className="text-right">{fmt(h.quantity, 0)}</td>
                      <td className="text-right">{fmt(h.avg_cost)}</td>
                      <td className="text-right font-medium">{fmtCcy(value)}</td>
                      <td className="text-right">
                        <span style={{ color: up ? 'var(--status-green)' : 'var(--status-red)' }}>
                          {fmtCcy(pnl)}<br />
                          <span className="text-xs">{fmtPct(pnlPct)}</span>
                        </span>
                      </td>
                      <td><Sparkline data={q?.spark ?? []} up={up} /></td>
                      <td>
                        <RowActions onEdit={() => setModal({ open: true, holding: h })} onDelete={() => deleteHolding(h.id)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Private holdings */}
      {privateHoldings.length > 0 && (
        <Section title="Private holdings">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="text-right">Cost basis</th>
                  <th className="text-right">Current value</th>
                  <th className="text-right">Unrealised P&L</th>
                  <th className="text-right">Multiple</th>
                  <th>Valuation date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {privateHoldings.map((h) => {
                  const pnl = (h.current_value ?? 0) - (h.cost_total ?? 0)
                  const mult = h.cost_total ? (h.current_value ?? 0) / h.cost_total : null
                  const up = pnl >= 0
                  return (
                    <tr key={h.id}>
                      <td className="font-medium">{h.name}</td>
                      <td className="text-right">{fmtCcy(h.cost_total)}</td>
                      <td className="text-right font-medium">{fmtCcy(h.current_value)}</td>
                      <td className="text-right">
                        <span style={{ color: up ? 'var(--status-green)' : 'var(--status-red)' }}>
                          {fmtCcy(pnl)}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="font-mono text-sm" style={{ color: up ? 'var(--status-green)' : 'var(--status-red)' }}>
                          {mult != null ? `${mult.toFixed(2)}x` : '—'}
                        </span>
                      </td>
                      <td className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {h.valuation_date || '—'}
                      </td>
                      <td>
                        <RowActions onEdit={() => setModal({ open: true, holding: h })} onDelete={() => deleteHolding(h.id)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {holdings.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <DollarSign size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No holdings yet</p>
          <p className="text-sm mt-1">Add your first position to get started</p>
        </div>
      )}

      {modal.open && (
        <HoldingModal
          holding={modal.holding}
          onClose={() => setModal({ open: false })}
          onSave={saveHolding}
        />
      )}
    </div>
  )
}

function StatTile({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--surface-border)' }}>
      <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xl font-semibold" style={{ color: positive === undefined ? 'var(--text-primary)' : positive ? 'var(--status-green)' : 'var(--status-red)' }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: positive === undefined ? 'var(--text-muted)' : positive ? 'var(--status-green)' : 'var(--status-red)' }}>{sub}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--surface-border)' }}>
      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--surface-border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={onEdit} className="p-1.5 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--brand-primary)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
        <Edit2 size={14} />
      </button>
      <button onClick={onDelete} className="p-1.5 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--status-red)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--surface-border)', borderTopColor: 'var(--brand-primary)' }} />
    </div>
  )
}
