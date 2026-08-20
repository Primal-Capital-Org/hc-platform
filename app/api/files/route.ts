import { NextRequest, NextResponse } from 'next/server'
import { sql, FILE_STAGES, PRIORITIES } from '@/lib/db'

function sanitise(body: Record<string, unknown>) {
  const name = String(body.name ?? '').trim().slice(0, 120)
  if (!name) return null
  const stage = FILE_STAGES.includes(body.stage as never) ? body.stage as string : FILE_STAGES[0]
  const priority = PRIORITIES.includes(body.priority as never) ? body.priority as string : 'Medium'
  const keywords = Array.isArray(body.keywords)
    ? body.keywords.map(String).map((k) => k.trim()).filter(Boolean).slice(0, 12)
    : String(body.keywords ?? '').split(',').map((k) => k.trim()).filter(Boolean).slice(0, 12)
  return { name, owner: String(body.owner ?? '').trim().slice(0, 60), stage, priority, keywords }
}

export async function GET() {
  const { rows } = await sql`SELECT * FROM files ORDER BY created_at ASC`
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const f = sanitise(body)
  if (!f) return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  const { rows } = await sql`
    INSERT INTO files (name, owner, stage, priority, keywords)
   VALUES (${f.name}, ${f.owner}, ${f.stage}, ${f.priority}, ${f.keywords.join(',')})
    RETURNING *`
  return NextResponse.json(rows[0], { status: 201 })
}

