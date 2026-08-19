import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  const { rows } = await sql`
    SELECT DISTINCT week_id FROM week_entries
    UNION SELECT week_id FROM week_notes
    ORDER BY week_id DESC`
  return NextResponse.json(rows.map((r) => r.week_id))
}
