export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

function sanitise(body: Record<string, unknown>) {
  const type = body.type === 'private' ? 'private' : body.type === 'public' ? 'public' : null
  if (!type) return null
  const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null }
  if (type === 'public') {
    const ticker = String(body.ticker ?? '').trim().toUpperCase()
    const quantity = num(body.quantity)
    const avg_cost = num(body.avg_cost)
    if (!ticker || !/^[A-Z0-9.^=\-]{1,12}$/.test(ticker) || quantity === null || avg_cost === null) return null
    return { type, ticker, name: String(body.name ?? '').trim().slice(0, 120), quantity, avg_cost }
  }
  const name = String(body.name ?? '').trim().slice(0, 120)
  const cost_total = num(body.cost_total)
  const current_value = num(body.current_value)
  if (!name || cost_total === null || current_value === null) return null
  return { type, name, cost_total, current_value, valuation_date: String(body.valuation_date ?? '').slice(0, 10) || null }
}

export async function GET() {
  const { rows } = await sql`SELECT * FROM holdings ORDER BY created_at ASC`
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const h = sanitise(body)
  if (!h) return NextResponse.json({ error: 'Invalid holding' }, { status: 400 })

  if (h.type === 'public') {
    const { rows } = await sql`
      INSERT INTO holdings (type, ticker, name, quantity, avg_cost)
      VALUES (${h.type}, ${h.ticker}, ${h.name}, ${h.quantity}, ${h.avg_cost})
      RETURNING *`
    return NextResponse.json(rows[0], { status: 201 })
  } else {
    const { rows } = await sql`
      INSERT INTO holdings (type, name, cost_total, current_value, valuation_date)
      VALUES (${h.type}, ${h.name}, ${h.cost_total}, ${h.current_value}, ${h.valuation_date})
      RETURNING *`
    return NextResponse.json(rows[0], { status: 201 })
  }
}
