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
    if (!ticker || quantity === null || avg_cost === null) return null
    return { type, ticker, name: String(body.name ?? '').trim().slice(0, 120), quantity, avg_cost }
  }
  const name = String(body.name ?? '').trim().slice(0, 120)
  const cost_total = num(body.cost_total)
  const current_value = num(body.current_value)
  if (!name || cost_total === null || current_value === null) return null
  return { type, name, cost_total, current_value, valuation_date: String(body.valuation_date ?? '').slice(0, 10) || null }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const h = sanitise(body)
  if (!h) return NextResponse.json({ error: 'Invalid holding' }, { status: 400 })

  if (h.type === 'public') {
    const { rows } = await sql`
      UPDATE holdings SET type=${h.type}, ticker=${h.ticker}, name=${h.name},
        quantity=${h.quantity}, avg_cost=${h.avg_cost}, updated_at=NOW()
      WHERE id=${params.id} RETURNING *`
    if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(rows[0])
  } else {
    const { rows } = await sql`
      UPDATE holdings SET type=${h.type}, name=${h.name}, cost_total=${h.cost_total},
        current_value=${h.current_value}, valuation_date=${h.valuation_date}, updated_at=NOW()
      WHERE id=${params.id} RETURNING *`
    if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(rows[0])
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { rowCount } = await sql`DELETE FROM holdings WHERE id=${params.id}`
  if (!rowCount) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
