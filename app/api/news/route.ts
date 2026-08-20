export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { fetchNews, NewsItem } from '@/lib/yahoo'

export async function GET() {
  const { rows } = await sql`SELECT DISTINCT ticker FROM holdings WHERE type='public' AND ticker IS NOT NULL`
  const tickers = rows.map((r) => r.ticker as string)
  const lists = await Promise.all(tickers.map(fetchNews))
  const seen = new Set<string>()
  const merged: NewsItem[] = []
  for (const items of lists) {
    for (const it of items) {
      if (seen.has(it.link)) {
        const ex = merged.find((x) => x.link === it.link)
        if (ex && !ex.symbols.includes(it.symbol)) ex.symbols.push(it.symbol)
        continue
      }
      seen.add(it.link)
      merged.push({ ...it, symbols: [it.symbol] })
    }
  }
  merged.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
  return NextResponse.json(merged.slice(0, 120))
}
