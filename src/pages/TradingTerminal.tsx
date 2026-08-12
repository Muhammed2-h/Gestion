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
import { RefreshCw, TrendingUp, TrendingDown, RotateCcw, Info, Activity, LineChart, Settings, XCircle, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

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
        grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
        crosshair: { mode: 1 },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
        timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: false },
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
    <div ref={containerRef} className="w-full h-[360px]" />
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
    <div className="flex items-center gap-2 text-[0.82rem] text-muted">
      <div className="animate-spin w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full" />
      Fetching price…
    </div>
  );

  if (error || !quote) return (
    <div className="text-[0.78rem] text-warning flex items-center gap-1.5">
      <Info size={13} />
      {error ?? 'No price data'}
    </div>
  );

  const isUp = quote.dayChange >= 0;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* LTP */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black font-mono text-primary tracking-tight">
          ${quote.ltp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className={`text-sm font-bold flex items-center gap-1 ${isUp ? 'text-profit' : 'text-loss'}`}>
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isUp ? '+' : ''}{quote.dayChange.toFixed(2)}
          ({isUp ? '+' : ''}{quote.dayChangePct.toFixed(2)}%)
        </span>
      </div>

      {/* OHLV mini */}
      <div className="flex gap-3 text-[0.72rem] text-muted ml-2">
        {[
          ['O', quote.open],
          ['H', quote.high],
          ['L', quote.low],
          ['P', quote.prevClose],
        ].map(([label, val]) => (
          <span key={label as string}>
            <span className="opacity-60 uppercase">{label} </span>
            <span className="font-mono text-secondary">
              {(val as number).toFixed(2)}
            </span>
          </span>
        ))}
        {quote.volume > 0 && (
          <span>
            <span className="opacity-60 uppercase">Vol </span>
            <span className="font-mono text-secondary">
              {quote.volume > 1e7 ? `${(quote.volume / 1e7).toFixed(1)}Cr` : `${(quote.volume / 1e5).toFixed(1)}L`}
            </span>
          </span>
        )}
      </div>

      <button
        onClick={refresh}
        className="btn btn-ghost p-1.5 rounded-md hover:bg-bg-secondary text-muted hover:text-primary transition-fast ml-auto"
        title="Refresh price"
      >
        <RefreshCw size={14} />
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
    <div className="app-content animate-fade-in flex flex-col h-full overflow-hidden pb-4">

      {/* ── Toast ────────────────────────────────────────────────── */}
      {toast && (
        <div 
          className={`fixed top-20 right-5 z-50 p-3 px-4 rounded-lg font-bold text-sm shadow-xl flex items-center gap-2 animate-slide-left border ${
            toast.ok ? 'bg-profit/10 border-profit text-profit' : 'bg-loss/10 border-loss text-loss'
          }`}
        >
          {toast.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────── */}
      <PageHeader
        title={
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <Activity size={24} className="text-accent" />
              Trading Terminal
            </span>
            <div className="flex bg-bg-card border border-border p-1 rounded-lg">
              <button 
                onClick={() => setMode('LIVE')} 
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-fast flex items-center gap-1.5 ${mode === 'LIVE' ? 'bg-accent text-white' : 'text-muted hover:text-primary'}`}
              >
                <LineChart size={14} /> Live Paper
              </button>
              <button 
                onClick={() => setMode('BACKTEST')} 
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-fast flex items-center gap-1.5 ${mode === 'BACKTEST' ? 'bg-accent text-white' : 'text-muted hover:text-primary'}`}
              >
                <Settings size={14} /> Backtest
              </button>
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <form onSubmit={e => { e.preventDefault(); setSymbol(inputSym.trim().toUpperCase()); }} className="flex gap-2">
              <input
                type="text"
                value={inputSym}
                onChange={e => setInput(e.target.value.toUpperCase())}
                className="form-input bg-bg-card border-border uppercase font-mono font-bold w-32"
                placeholder="e.g. RELIANCE.NS"
              />
              <button type="submit" className="btn btn-outline">Go</button>
            </form>
            {mode === 'BACKTEST' && (
              <button className="btn btn-primary" onClick={runBacktest} disabled={isBacktesting || candles.length === 0}>
                {isBacktesting ? '⏳ Running…' : '▶ Run Backtest'}
              </button>
            )}
            <button 
              className="btn btn-ghost px-2 text-muted hover:text-warning" 
              onClick={() => { if (confirm('Reset paper account to $100,000?')) { resetAccount(); showToast('Account reset to $100,000', true); }}} 
              title="Reset account"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        }
      />

      {/* ── Account Summary Bar ───────────────────────────────────── */}
      <Card className="flex flex-wrap items-center gap-6 mb-5 py-3 border-accent/20 bg-accent/5">
        {[
          { label: 'Cash', value: `$${capital.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-primary' },
          { label: 'Equity', value: `$${equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-primary' },
          { label: 'Unrealized P&L', value: `${unrealPnl >= 0 ? '+' : ''}$${unrealPnl.toFixed(2)}`, color: unrealPnl >= 0 ? 'text-profit' : 'text-loss' },
          { label: 'Total Return', value: `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`, color: totalReturn >= 0 ? 'text-profit' : 'text-loss' },
          { label: 'Positions', value: String(positions.length), color: 'text-primary' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col gap-1">
            <div className="text-[0.65rem] text-muted font-bold tracking-wider uppercase">{label}</div>
            <div className={`font-mono font-bold text-sm ${color}`}>{value}</div>
          </div>
        ))}
        <div className="ml-auto text-[0.7rem] text-muted">
          Initial: $100,000
        </div>
      </Card>

      {/* ── Main 2-column Layout ───────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">

        {/* Left Col: Chart + Ticker + Backtest Results */}
        <div className="flex-1 flex flex-col gap-5 min-w-0 h-full overflow-y-auto custom-scrollbar pr-2 lg:pr-0">
          
          <Card className="flex flex-col p-4 border-l-4 border-l-info">
            <div className="text-[0.65rem] text-muted mb-2 font-bold uppercase tracking-wider">
              {symbol} · refreshes every 15s
            </div>
            <PriceTicker symbol={symbol} />
          </Card>

          <Card className="flex flex-col p-0 overflow-hidden flex-shrink-0">
            <div className="flex items-center justify-between p-3 border-b border-border bg-bg-secondary/50">
              <span className="font-bold text-sm">{symbol} — Daily Candles</span>
              {candles.length === 0 && (
                <span className="text-[0.7rem] text-muted">Loading chart…</span>
              )}
            </div>
            <div className="bg-[#131722]">
              {candles.length > 0
                ? <CandlestickChart candles={candles} livePrice={livePrice} />
                : <div className="h-[360px] flex items-center justify-center text-muted text-sm">Loading chart data…</div>
              }
            </div>
          </Card>

          {/* Backtest Results */}
          {mode === 'BACKTEST' && result && (
            <Card className="animate-fade-in flex-shrink-0 mb-4">
              <h3 className="font-bold mb-4 text-primary">📈 Backtest Results — EMA Crossover</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Net Profit', value: `$${result.netProfit.toFixed(2)}`, color: result.netProfit >= 0 ? 'text-profit' : 'text-loss' },
                  { label: 'Win Rate',   value: `${(result.winRate * 100).toFixed(1)}%`, color: 'text-primary' },
                  { label: 'Max DD',     value: `${(result.maxDrawdown * 100).toFixed(2)}%`, color: 'text-loss' },
                  { label: 'Sharpe',     value: result.sharpeRatio.toFixed(2), color: 'text-primary' },
                  { label: 'Trades',     value: String(result.trades.length), color: 'text-primary' },
                  { label: 'Profit Factor', value: result.profitFactor.toFixed(2), color: 'text-primary' },
                  { label: 'CAGR',       value: `${(result.cagr * 100).toFixed(2)}%`, color: 'text-profit' },
                  { label: 'Final Eq',   value: `$${result.finalEquity.toFixed(0)}`, color: 'text-primary' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-bg-primary rounded-md p-3 border border-border">
                    <div className="text-[0.65rem] text-muted uppercase tracking-wider font-semibold mb-1">{label}</div>
                    <div className={`text-base font-bold font-mono ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Col: Order / Position / History Panel */}
        <div className="w-full lg:w-[360px] flex flex-col flex-shrink-0 h-full max-h-full">
          {mode === 'LIVE' ? (
            <Card className="flex flex-col h-full p-4 overflow-hidden">
              {/* Tab strip */}
              <div className="flex border-b border-border mb-4">
                {(['orders', 'positions', 'history'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTab(tab)}
                    className={`flex-1 text-center text-xs font-semibold pb-2 border-b-2 transition-fast ${
                      activeTab === tab 
                        ? 'border-accent text-accent' 
                        : 'border-transparent text-muted hover:text-primary'
                    }`}
                  >
                    {tab === 'orders' ? '📝 Order' : tab === 'positions' ? `📦 Pos (${positions.length})` : '📋 History'}
                  </button>
                ))}
              </div>
              
              <div className="flex-1 overflow-hidden">
                {activeTab === 'orders' && (
                  <OrderPanel symbol={symbol} currentPrice={livePrice} onMessage={showToast} />
                )}
                {activeTab === 'positions' && (
                  <PositionPanel currentPrice={livePrice} onMessage={showToast} />
                )}
                {activeTab === 'history' && <TradeHistoryPanel />}
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col h-max">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Settings size={16} /> Strategy Config</h3>
              <div className="flex flex-col gap-3">
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
                  <div key={k} className="flex justify-between items-center text-sm">
                    <span className="text-muted">{k}</span>
                    <span className="font-bold font-mono text-primary">{v}</span>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary w-full mt-6 justify-center py-2.5"
                onClick={runBacktest}
                disabled={isBacktesting || candles.length === 0}
              >
                {isBacktesting ? '⏳ Running…' : `▶ Run on ${symbol}`}
              </button>
            </Card>
          )}
        </div>
        
      </div>
    </div>
  );
}
