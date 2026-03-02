import { useEffect, useState } from 'react';
import { useSymbolStore } from '../store/useSymbolStore';
import { useBacktestStore } from '../store/useBacktestStore';
import { ExecutionService } from '../services/executionService';
import { WebSocketService } from '../services/websocketService';
import { MarketDataService } from '../services/marketDataService';
import OrderPanel from '../components/trading/OrderPanel';
import PositionPanel from '../components/trading/PositionPanel';
import TradeHistoryPanel from '../components/trading/TradeHistoryPanel';
import { StrategyRunner } from '../engine/backtesting/strategyRunner';
import { EmaCrossoverStrategy } from '../engine/strategies/emaCrossover';
import { createChart } from 'lightweight-charts';
import { useRef } from 'react';

export default function TradingTerminal() {
  const { symbol, setSymbol } = useSymbolStore();
  const { isBacktesting, setBacktesting, result, setResult } = useBacktestStore();
  
  const [mode, setMode] = useState<'LIVE'|'BACKTEST'>('LIVE');
  const [chartData, setChartData] = useState<any[]>([]);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const lineSeriesRef = useRef<any>(null);

  // Sync mode
  useEffect(() => {
    ExecutionService.getInstance().setMode(mode);
    if (mode === 'LIVE') {
        WebSocketService.connect();
        WebSocketService.subscribe(symbol);
    } else {
        WebSocketService.unsubscribe();
    }
    return () => {
        if (mode === 'LIVE') WebSocketService.unsubscribe();
    };
  }, [mode, symbol]);

  // Load historical data for chart when symbol changes
  useEffect(() => {
    let mounted = true;
    (async () => {
        try {
            const data = await MarketDataService.fetchHistoricalCandles(symbol, '2023-01-01');
            if (mounted && data.length > 0) {
               const formatted = data.map(d => ({
                   time: Math.floor(d.time / 1000) as unknown as string,
                   open: d.open,
                   high: d.high,
                   low: d.low,
                   close: d.close
               }));
               setChartData(formatted);

               if (lineSeriesRef.current) {
                   lineSeriesRef.current.setData(formatted);
               }
            }
        } catch (e) {
            console.error('Failed to load chart data');
        }
    })();
    return () => { mounted = false; }
  }, [symbol]);

  // Initialize TradingView lightweight chart
  useEffect(() => {
    if (chartContainerRef.current && !chartInstanceRef.current) {
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 400,
            layout: { background: { color: 'transparent' }, textColor: '#ccc' },
            grid: { vertLines: { color: '#2B2B43' }, horzLines: { color: '#2B2B43' } },
        });

        const series = (chart as any).addCandlestickSeries();
        chartInstanceRef.current = chart;
        lineSeriesRef.current = series;

        if (chartData.length > 0) {
           series.setData(chartData);
        }

        const handleResize = () => {
            if (chartContainerRef.current) {
               chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }
  }, []); // Run once

  const runBacktest = async () => {
      setBacktesting(true);
      const data = await MarketDataService.fetchHistoricalCandles(symbol, '2022-01-01');
      if (data.length === 0) {
         alert('No historical data available for backtest');
         setBacktesting(false);
         return;
      }
      
      const config = {
          initialCapital: 100000,
          commissionPct: 0.1,
          slippagePct: 0.05,
          positionSizingType: 'fixed_fractional' as const,
          positionSizeValue: 20
      };

      const strategy = new EmaCrossoverStrategy('ema1', 'EMA Crossover', { fastPeriod: 9, slowPeriod: 21, symbol });
      
      try {
        const btResult = await StrategyRunner.run(data, strategy, config);
        setResult(btResult);

        // Map trades back to chart markers
        if (lineSeriesRef.current) {
           const markers = btResult.trades.map(t => ({
               time: Math.floor(t.timestamp / 1000) as unknown as string,
               position: t.side === 'buy' ? 'belowBar' : 'aboveBar',
               color: t.side === 'buy' ? '#10B981' : '#EF4444',
               shape: t.side === 'buy' ? 'arrowUp' : 'arrowDown',
               text: t.side.toUpperCase()
           }));
           lineSeriesRef.current.setMarkers(markers.sort((a: any, b: any) => a.time - b.time));
        }

      } catch (e) {
         console.error(e);
      } finally {
         setBacktesting(false);
      }
  };

  return (
    <div className="app-content animate-fade-in">
        <div className="page-header terminal-header">
            <div>
               <h1 className="page-title">Trading Terminal</h1>
               <div className="terminal-mode-btns" style={{ marginTop: '8px' }}>
                  <button onClick={() => setMode('LIVE')} className={`btn ${mode==='LIVE'?'btn-primary':'btn-outline'}`}>Live Paper</button>
                  <button onClick={() => setMode('BACKTEST')} className={`btn ${mode==='BACKTEST'?'btn-primary':'btn-outline'}`}>Backtesting</button>
               </div>
            </div>
            <div className="terminal-controls">
                <input 
                  type="text" 
                  value={symbol} 
                  onChange={e => setSymbol(e.target.value.toUpperCase())} 
                  className="form-input" 
                  style={{ width: '120px' }} 
                />
                {mode === 'BACKTEST' && (
                    <button className="btn btn-primary" onClick={runBacktest} disabled={isBacktesting}>
                       {isBacktesting ? 'Running...' : 'Run EMA Backtest'}
                    </button>
                )}
            </div>
        </div>

        <div className="grid grid-3">
           <div className="span-2-mobile" style={{ gridColumn: 'span 2' }}>
               <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div ref={chartContainerRef} style={{ width: '100%', height: '400px' }} />
               </div>

               {mode === 'BACKTEST' && result && (
                  <div className="card mt-4">
                     <h3>Backtest Performance</h3>
                     <div className="grid grid-4 backtest-grid" style={{ marginTop: '16px' }}>
                         <div>
                            <div className="form-label">Net Profit</div>
                            <div style={{ fontSize: '1.2rem', color: result.netProfit >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}>
                               ${result.netProfit.toFixed(2)}
                            </div>
                         </div>
                         <div>
                            <div className="form-label">Win Rate</div>
                            <div style={{ fontSize: '1.2rem' }}>{(result.winRate * 100).toFixed(1)}%</div>
                         </div>
                         <div>
                            <div className="form-label">Max Drawdown</div>
                            <div style={{ fontSize: '1.2rem', color: 'var(--color-loss)' }}>{(result.maxDrawdown * 100).toFixed(2)}%</div>
                         </div>
                         <div>
                            <div className="form-label">Sharpe Ratio</div>
                            <div style={{ fontSize: '1.2rem' }}>{result.sharpeRatio.toFixed(2)}</div>
                         </div>
                     </div>
                  </div>
               )}
           </div>
           
           <div>
               {mode === 'LIVE' ? (
                  <>
                     <OrderPanel />
                     <PositionPanel />
                     <TradeHistoryPanel />
                  </>
               ) : (
                  <div className="card">
                     <h3>Backtest Params</h3>
                     <p className="form-label mt-2">Strategy: EMA Crossover</p>
                     <p className="form-label mt-2">Initial Capital: $100,000</p>
                     <p className="form-label mt-2">Slippage: 0.05%</p>
                     <p className="form-label mt-2">Commission: 0.1%</p>
                  </div>
               )}
           </div>
        </div>
    </div>
  );
}
