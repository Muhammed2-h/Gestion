import { useEffect, useRef } from 'react'
import { useWatchlistStore } from '@/store/watchlistStore'
import { fetchBatchQuotes } from '@/lib/marketData'

const POLL_INTERVAL_MS = 30_000  // 30 seconds

/**
 * Mounts once (e.g. in App.tsx or Watchlist page).
 * Polls Yahoo Finance every 30 seconds for watchlist prices
 * and dispatches updates into the store, which then checks alerts.
 */
export function useWatchlistPoller(enabled = true) {
  const items        = useWatchlistStore((s) => s.items)
  const updatePrices = useWatchlistStore((s) => s.updatePrices)
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPolling    = useRef(false)

  async function poll() {
    if (isPolling.current || items.length === 0) return
    isPolling.current = true
    try {
      const symbols = items.map((i) => ({ symbol: i.symbol, exchange: i.exchange }))
      const quotes  = await fetchBatchQuotes(symbols)
      const updates = Array.from(quotes.values()).map((q) => ({
        symbol:       q.symbol,
        exchange:     q.exchange,
        ltp:          q.ltp,
        open:         q.open,
        high:         q.high,
        low:          q.low,
        volume:       q.volume,
        dayChange:    q.dayChange,
        dayChangePct: q.dayChangePct,
      }))
      if (updates.length > 0) updatePrices(updates)
    } catch (err) {
      console.warn('[WatchlistPoller] Fetch error:', err)
    } finally {
      isPolling.current = false
    }
  }

  useEffect(() => {
    if (!enabled) return
    poll()                                  // immediate first fetch
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, items.length])              // re-start poller if watchlist size changes
}
