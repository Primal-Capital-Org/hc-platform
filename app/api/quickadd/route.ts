export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sql, isoWeekId } from '@/lib/db'
import { matchFileToText, classifyText } from '@/lib/classify'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const text = String(body.text ?? '').trim().slice(0, 1000)
  if (!text) return NextResponse.json({ error: 'Empty text' }, { status: 400 })

  const { rows: files } = await sql`SELECT * FROM files`
  const matches = matchFileToText(text, files as never)

  if (matches.length === 1) {
    const { file, word } = matches[0]
    // Strip leading "FileName: " prefix
    let clean = text.replace(new RegExp(`^\\s*${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:\\-–—]\\s*`, 'i'), '').trim() || text.trim()
    const parts = classifyText(clean)
    const weekId = isoWeekId()

    // Ensure week entry exists
    const { rows: entryRows } = await sql`
      INSERT INTO week_entries (week_id, file_id, update_text) VALUES (${weekId}, ${file.id}, '')
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
    return NextResponse.json({ filed: true, file: file.name, actions, updates })
  }

  // Land in inbox
  await sql`INSERT INTO inbox (id, text) VALUES (${crypto.randomUUID()}, ${text})`
  return NextResponse.json({ filed: false, suggestions: matches.map((m) => m.file.name) })
}
