import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { weekId: string } }) {
  const { weekId } = params
  if (!/^\d{4}-W\d{2}$/.test(weekId)) return NextResponse.json({ error: 'Bad week ID' }, { status: 400 })

  // Get week notes
  const { rows: noteRows } = await sql`SELECT notes FROM week_notes WHERE week_id=${weekId}`
  const notes = noteRows[0]?.notes ?? ''

  // Get all entries + tasks for this week
  const { rows: entries } = await sql`
    SELECT we.id, we.file_id, we.update_text,
           COALESCE(json_agg(t ORDER BY t.sort_order, t.created_at) FILTER (WHERE t.id IS NOT NULL), '[]') AS tasks
    FROM week_entries we
    LEFT JOIN tasks t ON t.week_entry_id = we.id
    WHERE we.week_id = ${weekId}
    GROUP BY we.id, we.file_id, we.update_text`

  const files: Record<string, { update: string; tasks: unknown[] }> = {}
  for (const e of entries) {
    files[e.file_id] = { update: e.update_text, tasks: e.tasks }
  }

  return NextResponse.json({ notes, files })
}

export async function PUT(req: NextRequest, { params }: { params: { weekId: string } }) {
  const { weekId } = params
  if (!/^\d{4}-W\d{2}$/.test(weekId)) return NextResponse.json({ error: 'Bad week ID' }, { status: 400 })
  const body = await req.json().catch(() => ({}))

  // Save week notes
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 20000) : ''
  await sql`INSERT INTO week_notes (week_id, notes) VALUES (${weekId}, ${notes})
    ON CONFLICT (week_id) DO UPDATE SET notes=EXCLUDED.notes, updated_at=NOW()`

  // Save per-file entries
  const filesIn = body.files && typeof body.files === 'object' ? body.files as Record<string, { update: string; tasks: { id?: string; text: string; done: boolean; sort_order?: number }[] }> : {}
  for (const [fileId, entry] of Object.entries(filesIn)) {
    if (!/^[a-f0-9-]{10,40}$/.test(fileId)) continue
    const update = typeof entry.update === 'string' ? entry.update.slice(0, 4000) : ''
    const { rows: entryRows } = await sql`
      INSERT INTO week_entries (week_id, file_id, update_text)
      VALUES (${weekId}, ${fileId}, ${update})
      ON CONFLICT (week_id, file_id) DO UPDATE SET update_text=EXCLUDED.update_text, updated_at=NOW()
      RETURNING id`
    const entryId = entryRows[0]?.id
    if (!entryId) continue

    // Replace tasks: delete existing, insert new
    await sql`DELETE FROM tasks WHERE week_entry_id=${entryId}`
    const tasks = Array.isArray(entry.tasks) ? entry.tasks.filter((t) => t?.text?.trim()) : []
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i]
      await sql`INSERT INTO tasks (week_entry_id, text, done, sort_order) VALUES (${entryId}, ${t.text.trim().slice(0,500)}, ${!!t.done}, ${i})`
    }
  }

  return NextResponse.json({ ok: true })
}
