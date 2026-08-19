'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Send, Check, Trash2, X,
  Calendar, Inbox, Edit2, ChevronDown, ChevronUp, Tag,
} from 'lucide-react'
import type { DealFile } from '@/lib/db'
import type { CalEvent } from '@/lib/ics'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoWeekId(d: Date = new Date()): string {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = dt.getUTCDay() || 7
  dt.setUTCDate(dt.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function weekLabel(weekId: string): string {
  const [year, w] = weekId.split('-W').map(Number)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const mon = new Date(jan4)
  mon.setUTCDate(jan4.getUTCDate() - (jan4Day - 1) + (w - 1) * 7)
  const fri = new Date(mon); fri.setUTCDate(mon.getUTCDate() + 4)
  const fmtDay = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const isCurrentWeek = weekId === isoWeekId()
  return `${fmtDay(mon)} – ${fmtDay(fri)}${isCurrentWeek ? ' (this week)' : ''}`
}

function prevWeek(id: string): string {
  const [y, w] = id.split('-W').map(Number)
  if (w === 1) return `${y - 1}-W52`
  return `${y}-W${String(w - 1).padStart(2, '0')}`
}
function nextWeek(id: string): string {
  const [y, w] = id.split('-W').map(Number)
  if (w >= 52) return `${y + 1}-W01`
  return `${y}-W${String(w + 1).padStart(2, '0')}`
}

const STAGE_COLORS: Record<string, string> = {
  'Sourcing': 'stage-sourcing', 'Screening': 'stage-screening',
  'Due Diligence': 'stage-diligence', 'IC / Approval': 'stage-ic',
  'Legals': 'stage-legals', 'Closed': 'stage-closed',
  'Monitoring': 'stage-monitoring', 'On Hold': 'stage-hold', 'Passed': 'stage-passed',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskItem { id: string; text: string; done: boolean }
interface FileEntry { tasks: TaskItem[]; update: string }
interface WeekData { notes: string; files: Record<string, FileEntry> }
interface InboxItem { id: string; text: string; created_at: string }

// ─── File modal ───────────────────────────────────────────────────────────────

const FILE_STAGES = ['Sourcing','Screening','Due Diligence','IC / Approval','Legals','Closed','Monitoring','On Hold','Passed']
const PRIORITIES  = ['High','Medium','Low']

function FileModal({ file, onClose, onSave }: {
  file?: Partial<DealFile>; onClose: () => void; onSave: (f: Partial<DealFile>) => Promise<void>
}) {
  const [form, setForm] = useState<Partial<DealFile>>(file ?? { stage: 'Sourcing', priority: 'Medium', keywords: [] })
  const [kw, setKw] = useState((file?.keywords ?? []).join(', '))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ ...form, keywords: kw.split(',').map((k) => k.trim()).filter(Boolean) })
    } catch (e) { setErr(String(e)) } finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-xl p-6 animate-fade-in" style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-modal)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base">{file?.id ? 'Edit file' : 'Add file'}</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name" required>
            <input className="field-input" value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Project Falcon" required />
          </Field>
          <Field label="Owner">
            <input className="field-input" value={form.owner ?? ''} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} placeholder="Your name" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stage">
              <select className="field-input" value={form.stage ?? 'Sourcing'} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as DealFile['stage'] }))}>
                {FILE_STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select className="field-input" value={form.priority ?? 'Medium'} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as DealFile['priority'] }))}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Calendar keywords (comma-separated)">
            <input className="field-input" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="falcon, project alpha" />
          </Field>
          {err && <p className="text-sm" style={{ color: 'var(--status-red)' }}>{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>Cancel</button>
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

// ─── File row ─────────────────────────────────────────────────────────────────

function FileRow({
  file, entry, events, onChange, onEdit, onDelete,
}: {
  file: DealFile
  entry: FileEntry
  events: CalEvent[]
  onChange: (entry: FileEntry) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [newTask, setNewTask] = useState('')
  const updateRef = useRef<HTMLTextAreaElement>(null)

  // Match calendar events to this file
  const fileWords = [file.name.toLowerCase(), ...(file.keywords || []).map((k) => k.toLowerCase())]
  const matchedEvents = events.filter((e) => fileWords.some((w) => e.summary.toLowerCase().includes(w)))

  function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.trim()) return
    onChange({ ...entry, tasks: [...(entry.tasks ?? []), { id: crypto.randomUUID(), text: newTask.trim(), done: false }] })
    setNewTask('')
  }

  function toggleTask(id: string) {
    onChange({ ...entry, tasks: (entry.tasks ?? []).map((t) => t.id === id ? { ...t, done: !t.done } : t) })
  }

  function deleteTask(id: string) {
    onChange({ ...entry, tasks: (entry.tasks ?? []).filter((t) => t.id !== id) })
  }

  const doneTasks = (entry.tasks ?? []).filter((t) => t.done).length
  const totalTasks = (entry.tasks ?? []).length

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-card)' }}>
      {/* Row header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        style={{ borderBottom: expanded ? '1px solid var(--surface-border)' : 'none' }}
        onClick={() => setExpanded((x) => !x)}
      >
        {/* Priority dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 priority-${file.priority.toLowerCase()}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STAGE_COLORS[file.stage] || ''}`}>{file.stage}</span>
            {file.owner && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{file.owner}</span>}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {totalTasks > 0 && (
            <span className="text-xs font-medium" style={{ color: doneTasks === totalTasks ? 'var(--status-green)' : 'var(--text-muted)' }}>
              {doneTasks}/{totalTasks}
            </span>
          )}
          {matchedEvents.length > 0 && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--status-blue)' }}>
              <Calendar size={12} />
              {matchedEvents.length}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-md" style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--brand-primary)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
              <Edit2 size={13} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-md" style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--status-red)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
              <Trash2 size={13} />
            </button>
          </div>
          {expanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x" style={{ '--tw-divide-color': 'var(--surface-border)' } as React.CSSProperties}>
          {/* Actions */}
          <div className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Actions</p>
            {(entry.tasks ?? []).map((t) => (
              <div key={t.id} className="flex items-start gap-2 group">
                <button
                  onClick={() => toggleTask(t.id)}
                  className="mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-all"
                  style={{
                    border: `1.5px solid ${t.done ? 'var(--status-green)' : 'var(--surface-border)'}`,
                    background: t.done ? 'var(--status-green)' : 'transparent',
                  }}
                >
                  {t.done && <Check size={10} color="#fff" />}
                </button>
                <span className="text-sm flex-1" style={{ color: t.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.done ? 'line-through' : 'none' }}>
                  {t.text}
                </span>
                <button onClick={() => deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded" style={{ color: 'var(--text-muted)' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
            <form onSubmit={addTask} className="flex items-center gap-2 mt-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add action…"
                className="flex-1 text-sm bg-transparent outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <button type="submit" disabled={!newTask.trim()} style={{ color: 'var(--text-muted)' }} className="disabled:opacity-40">
                <Plus size={14} />
              </button>
            </form>
          </div>

          {/* Update + meetings */}
          <div className="p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Update</p>
            <textarea
              ref={updateRef}
              value={entry.update ?? ''}
              onChange={(e) => onChange({ ...entry, update: e.target.value })}
              placeholder="What happened this week…"
              rows={4}
              className="w-full text-sm resize-none outline-none rounded-lg p-3"
              style={{
                background: 'var(--surface-input)',
                border: '1px solid var(--surface-border)',
                color: 'var(--text-primary)',
                lineHeight: '1.6',
              }}
            />
            {matchedEvents.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Meetings</p>
                {matchedEvents.slice(0, 3).map((ev, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Calendar size={11} className="mt-0.5 shrink-0" style={{ color: 'var(--status-blue)' }} />
                    <div>
                      <span style={{ color: 'var(--text-primary)' }}>{ev.summary}</span>
                      <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
                        {new Date(ev.start).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TrackerPage() {
  const [weekId, setWeekId] = useState(isoWeekId())
  const [files, setFiles] = useState<DealFile[]>([])
  const [weekData, setWeekData] = useState<WeekData>({ notes: '', files: {} })
  const [events, setEvents] = useState<CalEvent[]>([])
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [quickAdd, setQuickAdd] = useState('')
  const [qaResult, setQaResult] = useState<{ text: string; ok: boolean } | null>(null)
  const [fileModal, setFileModal] = useState<{ open: boolean; file?: Partial<DealFile> }>({ open: false })
  const [saving, setSaving] = useState(false)
  const saveTimeout = useRef<NodeJS.Timeout>()

  const loadWeek = useCallback(async (wid: string) => {
    const [fRes, wRes, cRes, iRes] = await Promise.all([
      fetch('/api/files'),
      fetch(`/api/week/${wid}`),
      fetch('/api/calendar'),
      fetch('/api/inbox'),
    ])
    setFiles(await fRes.json())
    setWeekData(await wRes.json())
    const calData = await cRes.json()
    setEvents(calData.events ?? [])
    setInbox(await iRes.json())
  }, [])

  useEffect(() => { loadWeek(weekId) }, [weekId, loadWeek])

  // Auto-save with debounce
  function updateEntry(fileId: string, entry: FileEntry) {
    setWeekData((d) => ({ ...d, files: { ...d.files, [fileId]: entry } }))
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => autoSave({ ...weekData, files: { ...weekData.files, [fileId]: entry } }), 1200)
  }

  async function autoSave(data: WeekData) {
    setSaving(true)
    await fetch(`/api/week/${weekId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickAdd.trim()) return
    const res = await fetch('/api/quickadd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: quickAdd }),
    })
    const data = await res.json()
    setQuickAdd('')
    if (data.filed) {
      setQaResult({ text: `Filed to "${data.file}" — ${data.actions.length} action(s), ${data.updates.length} update(s)`, ok: true })
      loadWeek(weekId)
    } else {
      setQaResult({ text: data.suggestions.length ? `Couldn't match — added to inbox (possible matches: ${data.suggestions.join(', ')})` : 'Added to inbox', ok: false })
      const iRes = await fetch('/api/inbox')
      setInbox(await iRes.json())
    }
    setTimeout(() => setQaResult(null), 5000)
  }

  async function fileInboxItem(itemId: string, fileId: string) {
    await fetch(`/api/inbox/${itemId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    })
    setInbox((prev) => prev.filter((i) => i.id !== itemId))
    loadWeek(weekId)
  }

  async function deleteInboxItem(id: string) {
    await fetch(`/api/inbox/${id}`, { method: 'DELETE' })
    setInbox((prev) => prev.filter((i) => i.id !== id))
  }

  async function saveFile(form: Partial<DealFile>) {
    const method = form.id ? 'PUT' : 'POST'
    const url = form.id ? `/api/files/${form.id}` : '/api/files'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (!res.ok) throw new Error((await res.json()).error)
    await loadWeek(weekId)
    setFileModal({ open: false })
  }

  async function deleteFile(id: string) {
    if (!confirm('Remove this file from the tracker?')) return
    await fetch(`/api/files/${id}`, { method: 'DELETE' })
    setFiles((f) => f.filter((x) => x.id !== id))
  }

  // Week meetings (not matched to any file)
  const weekStart = (() => {
    const [y, w] = weekId.split('-W').map(Number)
    const jan4 = new Date(Date.UTC(y, 0, 4))
    const jan4Day = jan4.getUTCDay() || 7
    const mon = new Date(jan4); mon.setUTCDate(jan4.getUTCDate() - (jan4Day - 1) + (w - 1) * 7)
    return mon.getTime()
  })()
  const weekEnd = weekStart + 5 * 86400000
  const weekEvents = events.filter((e) => e.start >= weekStart && e.start < weekEnd)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Weekly Tracker</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Deal files, actions and updates</p>
        </div>
        <div className="flex items-center gap-1 text-sm">
          {saving && <span className="text-xs mr-2" style={{ color: 'var(--text-muted)' }}>Saving…</span>}
          <button onClick={() => setWeekId(prevWeek(weekId))} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
            <ChevronLeft size={16} />
          </button>
          <div className="px-3 py-1.5 rounded-lg text-sm font-medium min-w-[200px] text-center" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
            {weekLabel(weekId)}
          </div>
          <button
            onClick={() => setWeekId(nextWeek(weekId))}
            disabled={weekId === isoWeekId()}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
            <ChevronRight size={16} />
          </button>
        </div>
        <button onClick={() => setFileModal({ open: true })} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--brand-primary)', color: '#fff' }}>
          <Plus size={14} /> Add file
        </button>
      </div>

      {/* Quick add */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-card)' }}>
        <form onSubmit={handleQuickAdd} className="flex items-center gap-3">
          <Send size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            placeholder="Quick add — paste an email or note and it'll be filed automatically…"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: 'var(--text-primary)' }}
          />
          <button type="submit" disabled={!quickAdd.trim()} className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all" style={{ background: 'var(--brand-primary)', color: '#fff' }}>
            Add
          </button>
        </form>
        {qaResult && (
          <p className="text-xs mt-2 pl-6" style={{ color: qaResult.ok ? 'var(--status-green)' : 'var(--status-amber)' }}>
            {qaResult.text}
          </p>
        )}
      </div>

      {/* Inbox */}
      {inbox.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--surface-border)' }}>
            <Inbox size={14} style={{ color: 'var(--status-amber)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Inbox ({inbox.length})</h2>
          </div>
          <div className="divide-y" style={{ '--tw-divide-color': 'var(--surface-border)' } as React.CSSProperties}>
            {inbox.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                <p className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{item.text}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    className="text-xs px-2 py-1 rounded-md outline-none"
                    style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-input)', color: 'var(--text-secondary)' }}
                    defaultValue=""
                    onChange={(e) => e.target.value && fileInboxItem(item.id, e.target.value)}
                  >
                    <option value="" disabled>File to…</option>
                    {files.filter((f) => !['Passed','Closed'].includes(f.stage)).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <button onClick={() => deleteInboxItem(item.id)} style={{ color: 'var(--text-muted)' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* This week's meetings */}
      {weekEvents.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} style={{ color: 'var(--status-blue)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Meetings this week</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {weekEvents.slice(0, 8).map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--status-blue)' }} />
                <div>
                  <span style={{ color: 'var(--text-primary)' }}>{ev.summary}</span>
                  <span className="ml-1.5" style={{ color: 'var(--text-muted)' }}>
                    {new Date(ev.start).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File rows */}
      <div className="space-y-3">
        {files.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
            <Tag size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No files yet</p>
            <p className="text-sm mt-1">Add a deal, portfolio company, or workstream to track</p>
          </div>
        ) : (
          files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              entry={weekData.files[file.id] ?? { tasks: [], update: '' }}
              events={events}
              onChange={(entry) => updateEntry(file.id, entry)}
              onEdit={() => setFileModal({ open: true, file })}
              onDelete={() => deleteFile(file.id)}
            />
          ))
        )}
      </div>

      {/* Week notes */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Week notes</p>
        <textarea
          value={weekData.notes}
          onChange={(e) => {
            const data = { ...weekData, notes: e.target.value }
            setWeekData(data)
            if (saveTimeout.current) clearTimeout(saveTimeout.current)
            saveTimeout.current = setTimeout(() => autoSave(data), 1200)
          }}
          placeholder="General notes for this week…"
          rows={4}
          className="w-full text-sm resize-none outline-none rounded-lg p-3"
          style={{ background: 'var(--surface-input)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', lineHeight: '1.6' }}
        />
      </div>

      {fileModal.open && (
        <FileModal
          file={fileModal.file}
          onClose={() => setFileModal({ open: false })}
          onSave={saveFile}
        />
      )}
    </div>
  )
}
