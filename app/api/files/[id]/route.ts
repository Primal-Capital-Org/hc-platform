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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const f = sanitise(body)
  if (!f) return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  const { rows } = await sql`
    UPDATE files SET name=${f.name}, owner=${f.owner}, stage=${f.stage},
      priority=${f.priority}, keywords=${f.keywords}, updated_at=NOW()
    WHERE id=${params.id} RETURNING *`
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { rowCount } = await sql`DELETE FROM files WHERE id=${params.id}`
  if (!rowCount) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
