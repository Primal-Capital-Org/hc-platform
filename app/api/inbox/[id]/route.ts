import { NextRequest, NextResponse } from 'next/server'
import { sql, isoWeekId } from '@/lib/db'
import { classifyText } from '@/lib/classify'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { rowCount } = await sql`DELETE FROM inbox WHERE id=${params.id}`
  if (!rowCount) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

// File an inbox item onto a deal file
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const { rows: inboxRows } = await sql`SELECT * FROM inbox WHERE id=${params.id}`
  if (!inboxRows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fileId = String(body.fileId ?? '')
  const { rows: fileRows } = await sql`SELECT * FROM files WHERE id=${fileId}`
  if (!fileRows[0]) return NextResponse.json({ error: 'Unknown file' }, { status: 400 })

  const text = inboxRows[0].text
  const parts = classifyText(text)
  const weekId = isoWeekId()

  const { rows: entryRows } = await sql`
    INSERT INTO week_entries (week_id, file_id, update_text) VALUES (${weekId}, ${fileId}, '')
    ON CONFLICT (week_id, file_id) DO UPDATE SET updated_at=NOW()
    RETURNING id`
  const entryId = entryRows[0]?.id

  const actions: string[] = []
  const updates: string[] = []
  for (const part of parts) {
    if (part.kind === 'action') {
      await sql`INSERT INTO tasks (week_entry_id, text, done) VALUES (${entryId}, ${part.text.slice(0,500)}, false)`
      actions.push(part.text)
    } else {
      await sql`UPDATE week_entries SET update_text = CASE WHEN update_text='' THEN ${part.text.slice(0,1000)} ELSE update_text || E'\n' || ${part.text.slice(0,1000)} END WHERE id=${entryId}`
      updates.push(part.text)
    }
  }

  await sql`DELETE FROM inbox WHERE id=${params.id}`
  return NextResponse.json({ ok: true, file: fileRows[0].name, actions, updates })
}
