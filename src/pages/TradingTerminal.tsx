import { useEffect, useState, useRef } from 'react';
import { useSymbolStore } from '../store/useSymbolStore';
import { useBacktestStore } from '../store/useBacktestStore';
import OrderPanel from '../components/trading/OrderPanel';
import PositionPanel from '../components/trading/PositionPanel';
import TradeHistoryPanel from '../components/trading/TradeHistoryPanel';
import { StrategyRunner } from '../engine/backtesting/strategyRunner';
import { EmaCrossoverStrategy } from '../engine/strategies/emaCrossover';
import type { Candle } from '../engine/types';

// ── lightweight-charts v5 compatible chart renderer ──────────────────────────
function CandlestickChart({ data }: { data: Candle[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let chart: ReturnType<typeof import('lightweight-charts').createChart>;
    let series: ReturnType<typeof chart.addSeries>;

    // Dynamic import to avoid SSR / top-level crash
    import('lightweight-charts').then(({ createChart, CandlestickSeries }) => {
      if (!containerRef.current) return;

      chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 380,
        layout: {
          background: { color: 'transparent' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { color: '#1e2a3d' },
          horzLines: { color: '#1e2a3d' },
        },
        rightPriceScale: { borderColor: '#1e2a3d' },
        timeScale: { borderColor: '#1e2a3d', timeVisible: true },
      });

      // v5 API: addSeries with CandlestickSeries type
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#10B981',
        downColor: '#EF4444',
        borderVisible: false,
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      });

      if (data.length > 0) {
        const formatted = data
          .map(d => ({
            time: Math.floor(d.time / 1000) as unknown as import('lightweight-charts').Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }))
          .sort((a, b) => (a.time as number) - (b.time as number));
        series.setData(formatted);
        chart.timeScale().fitContent();
      }

      const handleResize = () => {
        if (containerRef.current && chart) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);

      // cleanup stored in closure
      (containerRef.current as HTMLDivElement & { __cleanup?: () => void }).__cleanup = () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }).catch(err => {
      console.error('Chart init error:', err);
    });

    return () => {
      const el = containerRef.current as HTMLDivElement & { __cleanup?: () => void };
      el?.__cleanup?.();
    };
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: 380 }} />;
}

// ── Sample / demo candles when backend is unavailable ─────────────────────────
function generateDemoCandles(symbol: string): Candle[] {
  // 90 days of fake OHLCV starting from a deterministic seed
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const candles: Candle[] = [];
  let price = 1000 + (seed % 3000);
  const MS_PER_DAY = 86400_000;
  const start = Date.now() - 90 * MS_PER_DAY;

  for (let i = 0; i < 90; i++) {
    const open = price;
    const change = (Math.random() - 0.48) * price * 0.02;
    const close = Math.max(1, open + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    candles.push({
      time: start + i * MS_PER_DAY,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 1_000_000 + 100_000),
    });
    price = close;
  }
  return candles;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TradingTerminal() {
  const { symbol, setSymbol } = useSymbolStore();
  const { isBacktesting, setBacktesting, result, setResult } = useBacktestStore();

  const [mode, setMode] = useState<'LIVE' | 'BACKTEST'>('LIVE');
  const [candleData, setCandleData] = useState<Candle[]>([]);
  const [dataSource, setDataSource] = useState<'live' | 'demo'>('demo');
  const [activeTab, setActiveTab] = useState<'orders' | 'positions' | 'history'>('orders');

  // Load candle data (from backend if available, else demo)
  useEffect(() => {
    let mounted = true;
    setCandleData([]);

    fetch(`http://localhost:3001/api/historical?symbol=${symbol}&from=2023-01-01`)
      .then(r => r.json())
      .then((data: Candle[]) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setCandleData(data);
          setDataSource('live');
        } else {
          throw new Error('empty');
        }
      })
      .catch(() => {
        if (mounted) {
          setCandleData(generateDemoCandles(symbol));
          setDataSource('demo');
        }
      });

    return () => { mounted = false; };
  }, [symbol]);

  const runBacktest = async () => {
    setBacktesting(true);
    const data = candleData.length > 0 ? candleData : generateDemoCandles(symbol);

    const config = {
      initialCapital: 100_000,
      commissionPct: 0.1,
      slippagePct: 0.05,
      positionSizingType: 'fixed_fractional' as const,
      positionSizeValue: 20,
    };

    const strategy = new EmaCrossoverStrategy('ema1', 'EMA Crossover', {
      fastPeriod: 9,
      slowPeriod: 21,
      symbol,
    });

    try {
      const btResult = await StrategyRunner.run(data, strategy, config);
      setResult(btResult);
    } catch (e) {
      console.error('Backtest failed:', e);
      alert('Backtest failed — check console.');
    } finally {
      setBacktesting(false);
    }
  };

  return (
    <div className="app-content animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="page-header terminal-header">
        <div>
          <h1 className="page-title">Trading Terminal</h1>
          <div className="terminal-mode-btns" style={{ marginTop: 8 }}>
            <button
              onClick={() => setMode('LIVE')}
              className={`btn btn-sm ${mode === 'LIVE' ? 'btn-primary' : 'btn-outline'}`}
            >
              📊 Live Paper
            </button>
            <button
              onClick={() => setMode('BACKTEST')}
              className={`btn btn-sm ${mode === 'BACKTEST' ? 'btn-primary' : 'btn-outline'}`}
            >
              🔬 Backtest
            </button>
          </div>
        </div>

        <div className="terminal-controls">
          <input
            type="text"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            className="form-input"
            placeholder="Symbol…"
            style={{ maxWidth: 130 }}
          />
          {mode === 'BACKTEST' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={runBacktest}
              disabled={isBacktesting}
            >
              {isBacktesting ? '⏳ Running…' : '▶ Run EMA Backtest'}
            </button>
          )}
          {dataSource === 'demo' && (
            <span className="badge badge-warning">Demo data</span>
          )}
        </div>
      </div>

      {/* ── Main Layout ─────────────────────────────────────────── */}
      <div className="grid grid-3" style={{ alignItems: 'start', gap: 20 }}>

        {/* Left: Chart + Backtest Results (spans 2 cols on desktop) */}
        <div className="span-2-mobile" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Chart */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{symbol}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {dataSource === 'live' ? '🟢 Live data' : '🟡 Demo data (backend offline)'}
              </span>
            </div>
            <CandlestickChart data={candleData} />
          </div>

          {/* Backtest results */}
          {mode === 'BACKTEST' && result && (
            <div className="card animate-fade-in">
              <h3 style={{ marginBottom: 16 }}>📈 Backtest Results</h3>
              <div className="grid grid-4 backtest-grid" style={{ gap: 12 }}>
                {[
                  { label: 'Net Profit',     value: `$${result.netProfit.toFixed(2)}`,              color: result.netProfit >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' },
                  { label: 'Win Rate',        value: `${(result.winRate * 100).toFixed(1)}%`,         color: 'var(--text-primary)' },
                  { label: 'Max DD',          value: `${(result.maxDrawdown * 100).toFixed(2)}%`,     color: 'var(--color-loss)' },
                  { label: 'Sharpe',          value: result.sharpeRatio.toFixed(2),                   color: 'var(--text-primary)' },
                  { label: 'Total Trades',    value: String(result.trades.length),                    color: 'var(--text-primary)' },
                  { label: 'Profit Factor',   value: result.profitFactor.toFixed(2),                  color: 'var(--text-primary)' },
                  { label: 'CAGR',            value: `${(result.cagr * 100).toFixed(2)}%`,            color: 'var(--color-profit)' },
                  { label: 'Final Equity',    value: `$${result.finalEquity.toFixed(0)}`,             color: 'var(--text-primary)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                    <div className="form-label">{label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Order / Position panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'LIVE' ? (
            <>
              {/* Tab strip */}
              <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border)', paddingBottom: 4 }}>
                {(['orders', 'positions', 'history'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="btn btn-ghost btn-sm"
                    style={{
                      color: activeTab === tab ? 'var(--color-accent)' : 'var(--text-muted)',
                      borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
                      borderRadius: 0,
                      paddingBottom: 6,
                    }}
                  >
                    {tab === 'orders' ? '📝 Orders' : tab === 'positions' ? '📦 Positions' : '📋 History'}
                  </button>
                ))}
              </div>
              {activeTab === 'orders'    && <OrderPanel />}
              {activeTab === 'positions' && <PositionPanel />}
              {activeTab === 'history'   && <TradeHistoryPanel />}
            </>
          ) : (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>🔧 Backtest Params</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Strategy',        'EMA Crossover (9/21)'],
                  ['Symbol',          symbol],
                  ['Initial Capital', '$100,000'],
                  ['Commission',      '0.1% per trade'],
                  ['Slippage',        '0.05% per trade'],
                  ['Sizing',          '20% fixed fractional'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{v}</span>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary w-full mt-4"
                onClick={runBacktest}
                disabled={isBacktesting}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isBacktesting ? '⏳ Running…' : '▶ Run Backtest'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
