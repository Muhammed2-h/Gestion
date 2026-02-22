import { useState, useEffect } from 'react'
import { ExternalLink, Rss, Clock } from 'lucide-react'
import { fetchMarketNews, type NewsItem } from '@/lib/marketData'

export default function MarketNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await fetchMarketNews()
        if (mounted) setNews(data)
      } catch (err) {
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'var(--text-muted)' }}>
        <Rss className="animate-spin" style={{ opacity: 0.5, marginRight: 8 }} size={16} /> Loading latest news...
      </div>
    )
  }

  if (error || news.length === 0) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Unable to load market news at this time.
      </div>
    )
  }

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
        <Rss size={18} color="var(--color-profit)" />
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Live Market News</h3>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {news.slice(0, 5).map((item) => (
          <a
            key={item.uuid}
            href={item.link}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 14, borderBottom: '1px solid var(--color-border)' }}
            className="hover:opacity-80 transition-opacity"
          >
            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {item.title}
            </div>
            <div className="flex items-center gap-2" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <span>{item.publisher}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {new Date(item.providerPublishTime * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          </a>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <a href="https://finance.yahoo.com/topic/stock-market-news" target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--color-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          More on Yahoo Finance <ExternalLink size={10} />
        </a>
      </div>
    </div>
  )
}
