'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, ExternalLink, Newspaper } from 'lucide-react'
import type { NewsItem } from '@/lib/yahoo'

function timeAgo(ts: number | null): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const load = useCallback(async () => {
    const res = await fetch('/api/news')
    setNews(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function refresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const tickers = [...new Set(news.flatMap((n) => n.symbols))].sort()
  const filtered = filter === 'all' ? news : news.filter((n) => n.symbols.includes(filter))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--surface-border)', borderTopColor: 'var(--brand-primary)' }} />
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>News</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Headlines for your portfolio tickers</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
          style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', background: 'var(--surface-card)' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Ticker filter */}
      {tickers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: filter === 'all' ? 'var(--brand-primary)' : 'var(--surface-card)',
              color: filter === 'all' ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${filter === 'all' ? 'var(--brand-primary)' : 'var(--surface-border)'}`,
            }}
          >
            All
          </button>
          {tickers.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold font-mono transition-all"
              style={{
                background: filter === t ? 'var(--brand-primary)' : 'var(--surface-card)',
                color: filter === t ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${filter === t ? 'var(--brand-primary)' : 'var(--surface-border)'}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* News list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <Newspaper size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No news found</p>
          <p className="text-sm mt-1">Add public holdings to see relevant headlines</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 rounded-xl p-4 group transition-all block"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                boxShadow: 'var(--shadow-card)',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-primary)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--surface-border)')}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {item.symbols.map((s) => (
                    <span key={s} className="px-1.5 py-0.5 rounded text-xs font-mono font-semibold" style={{ background: 'var(--surface-hover)', color: 'var(--brand-primary)' }}>
                      {s}
                    </span>
                  ))}
                  {item.publishedAt && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(item.publishedAt)}</span>
                  )}
                </div>
                <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {item.description}
                  </p>
                )}
              </div>
              <ExternalLink size={14} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
