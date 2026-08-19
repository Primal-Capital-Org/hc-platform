import { sql } from '@vercel/postgres'

export { sql }

// ─── Types ────────────────────────────────────────────────────────────────────

export type HoldingType = 'public' | 'private'

export interface Holding {
  id: string
  type: HoldingType
  ticker?: string
  name: string
  quantity?: number
  avg_cost?: number
  cost_total?: number
  current_value?: number
  valuation_date?: string
  created_at: string
  updated_at: string
}

export const FILE_STAGES = [
  'Sourcing', 'Screening', 'Due Diligence', 'IC / Approval',
  'Legals', 'Closed', 'Monitoring', 'On Hold', 'Passed',
] as const
export type FileStage = typeof FILE_STAGES[number]

export const PRIORITIES = ['High', 'Medium', 'Low'] as const
export type Priority = typeof PRIORITIES[number]

export interface DealFile {
  id: string
  name: string
  owner: string
  stage: FileStage
  priority: Priority
  keywords: string[]
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  week_entry_id: string
  text: string
  done: boolean
  sort_order: number
  created_at: string
}

export interface WeekEntry {
  id: string
  week_id: string
  file_id: string
  update_text: string
  tasks: Task[]
}

export interface WeekData {
  notes: string
  files: Record<string, { tasks: Task[]; update: string }>
}

export interface InboxItem {
  id: string
  text: string
  created_at: string
}

// ─── Database initialisation ──────────────────────────────────────────────────
// Run once on first deploy via /api/db/migrate or `npm run db:migrate`

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS holdings (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type           TEXT NOT NULL CHECK (type IN ('public','private')),
      ticker         TEXT,
      name           TEXT NOT NULL,
      quantity       NUMERIC,
      avg_cost       NUMERIC,
      cost_total     NUMERIC,
      current_value  NUMERIC,
      valuation_date DATE,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS files (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT NOT NULL,
      owner      TEXT DEFAULT '',
      stage      TEXT NOT NULL DEFAULT 'Sourcing',
      priority   TEXT NOT NULL DEFAULT 'Medium',
      keywords   TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS week_entries (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_id     TEXT NOT NULL,
      file_id     UUID REFERENCES files(id) ON DELETE CASCADE,
      update_text TEXT DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(week_id, file_id)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_entry_id UUID REFERENCES week_entries(id) ON DELETE CASCADE,
      text          TEXT NOT NULL,
      done          BOOLEAN DEFAULT FALSE,
      sort_order    INTEGER DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS week_notes (
      week_id    TEXT PRIMARY KEY,
      notes      TEXT DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS inbox (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      text       TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

// ─── Settings helpers ─────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const { rows } = await sql`SELECT value FROM settings WHERE key = ${key}`
  return rows[0]?.value ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  await sql`
    INSERT INTO settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `
}

// ─── Week ID helpers ──────────────────────────────────────────────────────────

export function isoWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function weekIdToMonday(weekId: string): Date {
  const [year, w] = weekId.split('-W').map(Number)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1) + (w - 1) * 7)
  return monday
}
