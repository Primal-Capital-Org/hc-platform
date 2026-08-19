// Yahoo Finance helpers — proxied server-side to avoid CORS issues

const QUOTE_TTL = 2 * 60 * 1000   // 2 min
const NEWS_TTL  = 10 * 60 * 1000  // 10 min

const quoteCache = new Map<string, { at: number; data: QuoteResult }>()
const newsCache  = new Map<string, { at: number; items: NewsItem[] }>()

export interface QuoteResult {
  symbol: string
  name: string
  price: number | null
  prevClose: number | null
  currency: string
  marketTime: number | null
  spark: number[]
  error: string | null
}

export interface NewsItem {
  symbol: string
  symbols: string[]
  title: string
  link: string
  publishedAt: number | null
  description: string
}

export async function fetchQuote(symbol: string): Promise<QuoteResult> {
  const cached = quoteCache.get(symbol)
  if (cached && Date.now() - cached.at < QUOTE_TTL) return cached.data

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 HCPlatform/2.0' },
      next: { revalidate: 120 },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json()
    const result = body?.chart?.result?.[0]
    if (!result) throw new Error('empty result')

    const meta   = result.meta || {}
    const closes = (result.indicators?.quote?.[0]?.close || []).filter((v: unknown) => v != null) as number[]

    const data: QuoteResult = {
      symbol,
      name: meta.shortName || meta.longName || symbol,
      price: meta.regularMarketPrice ?? closes[closes.length - 1] ?? null,
      prevClose: closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose ?? null),
      currency: meta.currency || 'USD',
      marketTime: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
      spark: closes.slice(-22),
      error: null,
    }
    quoteCache.set(symbol, { at: Date.now(), data })
    return data
  } catch (err) {
    if (cached) return cached.data
    return { symbol, name: symbol, price: null, prevClose: null, currency: 'USD', marketTime: null, spark: [], error: String(err) }
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
}

function parseRss(xml: string, symbol: string): NewsItem[] {
  const items: NewsItem[] = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const block = m[1]
    const pick = (tag: string) => {
      const mm = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`))
      return mm ? decodeEntities(mm[1].trim()) : ''
    }
    const title = pick('title')
    const link  = pick('link')
    if (!title || !link) continue
    items.push({
      symbol, symbols: [symbol],
      title, link,
      publishedAt: pick('pubDate') ? new Date(pick('pubDate')).getTime() : null,
      description: pick('description').replace(/<[^>]+>/g, '').slice(0, 280),
    })
  }
  return items
}

export async function fetchNews(symbol: string): Promise<NewsItem[]> {
  const cached = newsCache.get(symbol)
  if (cached && Date.now() - cached.at < NEWS_TTL) return cached.items

  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 HCPlatform/2.0' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    const items = parseRss(xml, symbol)
    newsCache.set(symbol, { at: Date.now(), items })
    return items
  } catch {
    return cached ? cached.items : []
  }
}
