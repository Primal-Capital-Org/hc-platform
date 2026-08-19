import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { fetchQuote } from '@/lib/yahoo'

export async function GET() {
  const { rows } = await sql`SELECT DISTINCT ticker FROM holdings WHERE type='public' AND ticker IS NOT NULL`
  const tickers = rows.map((r) => r.ticker as string)
  const results = await Promise.all(tickers.map(fetchQuote))
  const bySymbol: Record<string, unknown> = {}
  for (const q of results) bySymbol[q.symbol] = q
  return NextResponse.json(bySymbol)
}
