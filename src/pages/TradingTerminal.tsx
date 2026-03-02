import { useEffect, useState, useRef, useCallback } from 'react';
import { useMarketFeed } from '../hooks/useMarketFeed';
import { usePaperTradingStore } from '../store/usePaperTradingStore';
import { useBacktestStore } from '../store/useBacktestStore';
import { StrategyRunner } from '../engine/backtesting/strategyRunner';
import { EmaCrossoverStrategy } from '../engine/strategies/emaCrossover';
import type { Candle } from '../engine/types';
import OrderPanel from '../components/trading/OrderPanel';
import PositionPanel from '../components/trading/PositionPanel';
import TradeHistoryPanel from '../components/trading/TradeHistoryPanel';
import { RefreshCw, TrendingUp, TrendingDown, RotateCcw, Info } from 'lucide-react';

// ─── lightweight-charts v5 chart component ────────────────────────────────────

interface CandleBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

function CandlestickChart({
  candles,
  livePrice,
}: {
  candles: CandleBar[];
  livePrice: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);
  const seriesRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;
    let cleanup = () => {};

    import('lightweight-charts').then(({ createChart, CandlestickSeries }) => {
      if (!containerRef.current) return;

      // Remove old chart if re-creating
      if (chartRef.current) {
        (chartRef.current as { remove(): void }).remove();
        chartRef.current = null;
        seriesRef.current = null;
      }

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 360,
        layout: { background: { color: 'transparent' }, textColor: '#94a3b8' },
        grid: { vertLines: { color: '#1a2235' }, horzLines: { color: '#1a2235' } },
        crosshair: { mode: 1 },
        rightPriceScale: { borderColor: '#1e2a3d' },
        timeScale: { borderColor: '#1e2a3d', timeVisible: true, secondsVisible: false },
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#10B981', downColor: '#EF4444',
        borderVisible: false,
        wickUpColor: '#10B981', wickDownColor: '#EF4444',
      });

      const sorted = [...candles]
        .sort((a, b) => a.time - b.time)
        .map(c => ({ ...c, time: c.time as unknown as import('lightweight-charts').Time }));

      series.setData(sorted);
      chart.timeScale().fitContent();

      chartRef.current = chart;
      seriesRef.current = series;

      const handleResize = () => {
        if (containerRef.current && chartRef.current) {
          (chartRef.current as { applyOptions(o: object): void }).applyOptions({
            width: containerRef.current.clientWidth,
          });
        }
      };
      window.addEventListener('resize', handleResize);

      cleanup = () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }).catch(console.error);

    return () => cleanup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles]);

  // Update live price as a real-time bar when livePrice changes
  useEffect(() => {
    if (!seriesRef.current || livePrice <= 0 || candles.length === 0) return;
    const last = candles[candles.length - 1];
    (seriesRef.current as {
      update(bar: { time: unknown; open: number; high: number; low: number; close: number }): void
    }).update({
      time: last.time as unknown as import('lightweight-charts').Time,
      open: last.open,
      high: Math.max(last.high, livePrice),
      low: Math.min(last.low, livePrice),
      close: livePrice,
    });
  }, [livePrice, candles]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: 360 }} />
  );
}

// ─── Demo candle generator ────────────────────────────────────────────────────
function generateDemoCandles(symbol: string): CandleBar[] {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bars: CandleBar[] = [];
  let price = 1000 + (seed % 3000);
  const MS_DAY = 86400_000;
  const start = Date.now() - 90 * MS_DAY;

  for (let i = 0; i < 90; i++) {
    const open = price;
    const chg = (Math.random() - 0.47) * price * 0.02;
    const close = Math.max(1, open + chg);
    bars.push({
      time: Math.floor((start + i * MS_DAY) / 1000),
      open, high: Math.max(open, close) * (1 + Math.random() * 0.008),
      low: Math.min(open, close) * (1 - Math.random() * 0.008), close,
    });
    price = close;
  }
  return bars;
}

// ─── Price Ticker Widget ──────────────────────────────────────────────────────
function PriceTicker({ symbol }: { symbol: string }) {
  const { quote, loading, error, refresh } = useMarketFeed(symbol);
  const { updatePositionPrices, processPendingOrders } = usePaperTradingStore();

  // Update paper trading engine whenever price updates
  useEffect(() => {
    if (quote && quote.ltp > 0) {
      updatePositionPrices(symbol, quote.ltp);
      processPendingOrders(symbol, quote.ltp);
    }
  }, [quote, symbol, updatePositionPrices, processPendingOrders]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
      <div className="animate-spin" style={{ width: 14, height: 14, border: '2px solid var(--color-accent)', borderTopColor: 'transparent', borderRadius: '50%' }} />
      Fetching price…
    </div>
  );

  if (error || !quote) return (
    <div style={{ fontSize: '0.78rem', color: 'var(--color-warning)' }}>
      <Info size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
      {error ?? 'No price data'}
    </div>
  );

  const isUp = quote.dayChange >= 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      {/* LTP */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontSize: '1.8rem', fontWeight: 800,
          fontFamily: 'var(--font-mono)', color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
        }}>
          ${quote.ltp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span style={{
          fontSize: '0.9rem', fontWeight: 700,
          color: isUp ? 'var(--color-profit)' : 'var(--color-loss)',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isUp ? '+' : ''}{quote.dayChange.toFixed(2)}
          ({isUp ? '+' : ''}{quote.dayChangePct.toFixed(2)}%)
        </span>
      </div>

      {/* OHLV mini */}
      <div style={{ display: 'flex', gap: 10, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        {[
          ['O', quote.open],
          ['H', quote.high],
          ['L', quote.low],
          ['P', quote.prevClose],
        ].map(([label, val]) => (
          <span key={label as string}>
            <span style={{ opacity: 0.6 }}>{label} </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {(val as number).toFixed(2)}
            </span>
          </span>
        ))}
        {quote.volume > 0 && (
          <span>
            <span style={{ opacity: 0.6 }}>Vol </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {quote.volume > 1e7 ? `${(quote.volume / 1e7).toFixed(1)}Cr` : `${(quote.volume / 1e5).toFixed(1)}L`}
            </span>
          </span>
        )}
      </div>

      <button
        onClick={refresh}
        className="btn btn-ghost btn-sm"
        title="Refresh price"
        style={{ marginLeft: 'auto' }}
      >
        <RefreshCw size={13} />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TradingTerminal() {
  const [symbol, setSymbol]   = useState('AAPL');
  const [inputSym, setInput]  = useState('AAPL');
  const [mode, setMode]       = useState<'LIVE' | 'BACKTEST'>('LIVE');
  const [activeTab, setTab]   = useState<'orders' | 'positions' | 'history'>('orders');
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  const { isBacktesting, setBacktesting, result, setResult } = useBacktestStore();
  const { capital, positions, totalEquity, totalUnrealizedPnl, resetAccount } = usePaperTradingStore();

  // Get current live price from store (updated by PriceTicker)
  const livePosition = positions.find(p => p.symbol === symbol);
  const currentPriceFromPos = livePosition?.currentPrice ?? 0;

  // We need the live price for the order panel
  const { quote } = useMarketFeed(symbol);
  const livePrice = quote?.ltp ?? currentPriceFromPos;

  // Chart candles
  const [candles, setCandles] = useState<CandleBar[]>([]);

  useEffect(() => {
    setCandles([]);
    // Fetch historical from Yahoo (1y, 1d interval)
    fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`)
      .then(r => r.json())
      .then(data => {
        const result = data?.chart?.result?.[0];
        if (!result) throw new Error('empty');
        const timestamps: number[] = result.timestamp ?? [];
        const quotes = result.indicators?.quote?.[0];
        if (!quotes || timestamps.length === 0) throw new Error('no quotes');

        const bars: CandleBar[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          const c = quotes.close?.[i];
          const o = quotes.open?.[i];
          const h = quotes.high?.[i];
          const l = quotes.low?.[i];
          if (c == null || o == null) continue;
          bars.push({ time: timestamps[i], open: o, high: h ?? c, low: l ?? c, close: c });
        }
        setCandles(bars);
      })
      .catch(() => setCandles(generateDemoCandles(symbol)));
  }, [symbol]);

  // Toast dismissal
  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Backtest
  const runBacktest = async () => {
    setBacktesting(true);
    const data: Candle[] = candles.map(c => ({
      time: c.time * 1000,
      open: c.open, high: c.high, low: c.low, close: c.close,
    }));

    try {
      const strategy = new EmaCrossoverStrategy('ema1', 'EMA Crossover', { fastPeriod: 9, slowPeriod: 21, symbol });
      const btResult = await StrategyRunner.run(data, strategy, {
        initialCapital: 100_000, commissionPct: 0.1, slippagePct: 0.05,
        positionSizingType: 'fixed_fractional', positionSizeValue: 20,
      });
      setResult(btResult);
      showToast(`Backtest done: ${btResult.trades.length} trades`, true);
    } catch (e) {
      console.error(e);
      showToast('Backtest failed — see console', false);
    } finally {
      setBacktesting(false);
    }
  };

  const equity = totalEquity();
  const unrealPnl = totalUnrealizedPnl();
  const totalReturn = ((equity - 100_000) / 100_000) * 100;

  return (
    <div className="app-content animate-fade-in">

      {/* ── Toast ────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, right: 20, zIndex: 9999,
          background: toast.ok ? 'var(--color-profit-bg)' : 'var(--color-loss-bg)',
          border: `1px solid ${toast.ok ? 'var(--color-profit)' : 'var(--color-loss)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '12px 18px',
          color: toast.ok ? 'var(--color-profit)' : 'var(--color-loss)',
          fontWeight: 600, fontSize: '0.85rem',
          boxShadow: 'var(--shadow-lg)',
          maxWidth: 340,
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="page-header terminal-header">
        <div>
          <h1 className="page-title">Trading Terminal</h1>
          <div className="terminal-mode-btns" style={{ marginTop: 8 }}>
            <button onClick={() => setMode('LIVE')} className={`btn btn-sm ${mode === 'LIVE' ? 'btn-primary' : 'btn-outline'}`}>
              📊 Live Paper
            </button>
            <button onClick={() => setMode('BACKTEST')} className={`btn btn-sm ${mode === 'BACKTEST' ? 'btn-primary' : 'btn-outline'}`}>
              🔬 Backtest
            </button>
          </div>
        </div>

        <div className="terminal-controls">
          {/* Symbol search */}
          <form onSubmit={e => { e.preventDefault(); setSymbol(inputSym.trim().toUpperCase()); }} style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={inputSym}
              onChange={e => setInput(e.target.value.toUpperCase())}
              className="form-input"
              placeholder="e.g. RELIANCE.NS"
              style={{ maxWidth: 160 }}
            />
            <button type="submit" className="btn btn-outline btn-sm">Go</button>
          </form>
          {mode === 'BACKTEST' && (
            <button className="btn btn-primary btn-sm" onClick={runBacktest} disabled={isBacktesting || candles.length === 0}>
              {isBacktesting ? '⏳ Running…' : '▶ Run Backtest'}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('Reset paper account to $100,000?')) { resetAccount(); showToast('Account reset to $100,000', true); }}} title="Reset account">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* ── Account Summary Bar ───────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap',
        marginBottom: 20, padding: '12px 16px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        alignItems: 'center',
      }}>
        {[
          { label: 'Cash', value: `$${capital.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'var(--text-primary)' },
          { label: 'Equity', value: `$${equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'var(--text-primary)' },
          { label: 'Unrealized P&L', value: `${unrealPnl >= 0 ? '+' : ''}$${unrealPnl.toFixed(2)}`, color: unrealPnl >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' },
          { label: 'Total Return', value: `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`, color: totalReturn >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' },
          { label: 'Positions', value: String(positions.length), color: 'var(--text-primary)' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color }}>{value}</div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Initial: $100,000
        </div>
      </div>

      {/* ── Price Ticker ──────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {symbol} · refreshes every 15s
        </div>
        <PriceTicker symbol={symbol} />
      </div>

      {/* ── Main 3-column Grid ───────────────────────────────────── */}
      <div className="grid grid-3" style={{ alignItems: 'start', gap: 16 }}>

        {/* Left 2/3: Chart + Backtest Results */}
        <div className="span-2-mobile" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{symbol} — Daily Candles</span>
              {candles.length === 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Loading chart…</span>
              )}
            </div>
            {candles.length > 0
              ? <CandlestickChart candles={candles} livePrice={livePrice} />
              : <div style={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading chart data…</div>
            }
          </div>

          {/* Backtest Results */}
          {mode === 'BACKTEST' && result && (
            <div className="card animate-fade-in">
              <h3 style={{ marginBottom: 14 }}>📈 Backtest Results — EMA Crossover</h3>
              <div className="grid grid-4 backtest-grid" style={{ gap: 10 }}>
                {[
                  { label: 'Net Profit', value: `$${result.netProfit.toFixed(2)}`, color: result.netProfit >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' },
                  { label: 'Win Rate',   value: `${(result.winRate * 100).toFixed(1)}%`, color: 'var(--text-primary)' },
                  { label: 'Max DD',     value: `${(result.maxDrawdown * 100).toFixed(2)}%`, color: 'var(--color-loss)' },
                  { label: 'Sharpe',     value: result.sharpeRatio.toFixed(2), color: 'var(--text-primary)' },
                  { label: 'Trades',     value: String(result.trades.length), color: 'var(--text-primary)' },
                  { label: 'Profit Factor', value: result.profitFactor.toFixed(2), color: 'var(--text-primary)' },
                  { label: 'CAGR',       value: `${(result.cagr * 100).toFixed(2)}%`, color: 'var(--color-profit)' },
                  { label: 'Final Eq',   value: `$${result.finalEquity.toFixed(0)}`, color: 'var(--text-primary)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                    <div className="form-label">{label}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)', marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1/3: Order / Position / History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'LIVE' ? (
            <>
              {/* Tab strip */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: 2 }}>
                {(['orders', 'positions', 'history'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTab(tab)}
                    className="btn btn-ghost btn-sm"
                    style={{
                      flex: 1, justifyContent: 'center', fontSize: '0.72rem',
                      color: activeTab === tab ? 'var(--color-accent)' : 'var(--text-muted)',
                      borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                      borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
                      paddingBottom: 8,
                    }}
                  >
                    {tab === 'orders' ? '📝 Order' : tab === 'positions' ? `📦 Pos (${positions.length})` : '📋 History'}
                  </button>
                ))}
              </div>
              {activeTab === 'orders' && (
                <OrderPanel symbol={symbol} currentPrice={livePrice} onMessage={showToast} />
              )}
              {activeTab === 'positions' && (
                <PositionPanel currentPrice={livePrice} onMessage={showToast} />
              )}
              {activeTab === 'history' && <TradeHistoryPanel />}
            </>
          ) : (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>🔧 Strategy Config</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Strategy', 'EMA Crossover'],
                  ['Fast EMA', '9 periods'],
                  ['Slow EMA', '21 periods'],
                  ['Symbol', symbol],
                  ['Capital', '$100,000'],
                  ['Commission', '0.1%'],
                  ['Slippage', '0.05%'],
                  ['Sizing', '20% fixed fractional'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary mt-4"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={runBacktest}
                disabled={isBacktesting || candles.length === 0}
              >
                {isBacktesting ? '⏳ Running…' : `▶ Run on ${symbol}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
