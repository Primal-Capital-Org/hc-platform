export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSetting, setSetting } from '@/lib/db'
import { ensurePasscode } from '@/lib/auth'
import { initDb } from '@/lib/db'

export async function GET() {
  // Ensure DB is initialised and passcode exists
  try { await initDb() } catch { /* already exists */ }
  await ensurePasscode()

  const icsUrl = await getSetting('ics_url')
  const passcode = await getSetting('passcode')
  return NextResponse.json({
    icsConfigured: !!icsUrl,
    icsHint: icsUrl ? icsUrl.slice(0, 40) + '…' : '',
    passcode: passcode ?? '',
  })
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  if ('icsUrl' in body) {
    const u = String(body.icsUrl ?? '').trim()
    if (u && !/^https:\/\//i.test(u)) return NextResponse.json({ error: 'URL must start with https://' }, { status: 400 })
    await setSetting('ics_url', u)
  }

  if ('passcode' in body) {
    const p = String(body.passcode ?? '').trim()
    if (p.length < 6) return NextResponse.json({ error: 'Passcode must be at least 6 characters' }, { status: 400 })
    await setSetting('passcode', p)
  }

  return NextResponse.json({ ok: true })
}
