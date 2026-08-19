import { NextResponse } from 'next/server'
import { getSetting } from '@/lib/db'
import { fetchCalendar } from '@/lib/ics'

export async function GET() {
  const url = await getSetting('ics_url')
  if (!url) return NextResponse.json({ configured: false, events: [] })
  const result = await fetchCalendar(url)
  return NextResponse.json({ configured: true, ...result })
}
