import { useState, useEffect, useCallback, useRef } from 'react';

export interface MarketQuote {
  symbol: string;
  ltp: number;         // Last traded price
  open: number;
  high: number;
  low: number;
  prevClose: number;
  dayChange: number;
  dayChangePct: number;
  volume: number;
  timestamp: number;
  status: 'live' | 'delayed' | 'demo';
}

// Yahoo Finance v8 chart endpoint - works client-side for most symbols
async function fetchYahooQuote(symbol: string): Promise<MarketQuote | null> {
  // For Indian stocks, user should append .NS or .BO (e.g., RELIANCE.NS)
  // For US stocks, plain symbol (e.g., AAPL, TSLA)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('No data');

  const meta = result.meta;
  const quotes = result.indicators?.quote?.[0];
  const timestamps = result.timestamp ?? [];

  // Get last valid candle
  let lastClose = meta.regularMarketPrice ?? meta.previousClose ?? 0;
  let lastOpen = meta.chartPreviousClose ?? lastClose;
  let lastHigh = lastClose;
  let lastLow = lastClose;
  let lastVol = 0;

  if (quotes && timestamps.length > 0) {
    // Find last non-null close
    for (let i = timestamps.length - 1; i >= 0; i--) {
      if (quotes.close?.[i] != null) {
        lastClose = quotes.close[i];
        lastOpen = quotes.open?.[i] ?? lastOpen;
        lastHigh = quotes.high?.[i] ?? lastHigh;
        lastLow = quotes.low?.[i] ?? lastLow;
        lastVol = quotes.volume?.[i] ?? 0;
        break;
      }
    }
  }

  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? lastClose;
  const dayChange = lastClose - prevClose;
  const dayChangePct = prevClose !== 0 ? (dayChange / prevClose) * 100 : 0;

  return {
    symbol,
    ltp: lastClose,
    open: meta.regularMarketDayHigh ? (meta.regularMarketDayLow ?? lastOpen) : lastOpen,
    high: meta.regularMarketDayHigh ?? lastHigh,
    low: meta.regularMarketDayLow ?? lastLow,
    prevClose,
    dayChange,
    dayChangePct,
    volume: meta.regularMarketVolume ?? lastVol,
    timestamp: Date.now(),
    status: 'live',
  };
}

const POLL_INTERVAL = 15_000; // 15 seconds

export function useMarketFeed(symbol: string) {
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchQuote = useCallback(async () => {
    if (!symbol.trim()) return;
    try {
      const q = await fetchYahooQuote(symbol.trim());
      if (mountedRef.current && q) {
        setQuote(q);
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(`Cannot fetch ${symbol} — try appending .NS for NSE or .BO for BSE`);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setQuote(null);
    setError(null);

    fetchQuote();

    timerRef.current = setInterval(fetchQuote, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchQuote]);

  return { quote, loading, error, refresh: fetchQuote };
}
