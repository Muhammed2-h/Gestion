import type {  Trade, BacktestResult  } from '../types';

export function calculateMetrics(initialEquity: number, equityCurve: { time: number; equity: number }[], trades: Trade[]): Omit<BacktestResult, 'trades' | 'equityCurve'> {
  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialEquity;
  const netProfit = finalEquity - initialEquity;

  let maxDrawdown = 0;
  let peak = initialEquity;
  for (const point of equityCurve) {
    if (point.equity > peak) {
      peak = point.equity;
    }
    const drawdown = (peak - point.equity) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  let winningTrades = 0;
  let losingTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;

  for (const trade of trades) {
    if (trade.pnl && trade.pnl > 0) {
      winningTrades++;
      grossProfit += trade.pnl;
    } else if (trade.pnl && trade.pnl <= 0) {
      losingTrades++;
      grossLoss += Math.abs(trade.pnl);
    }
  }

  const winRate = trades.length > 0 ? winningTrades / trades.length : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Object.is(grossProfit, 0) ? 0 : 999;

  // Simple CAGR based on time in years (assuming time is unix timestamp in ms)
  let cagr = 0;
  if (equityCurve.length > 0) {
    const startTime = equityCurve[0].time;
    const endTime = equityCurve[equityCurve.length - 1].time;
    const msInYear = 1000 * 60 * 60 * 24 * 365;
    const years = (endTime - startTime) / msInYear;
    if (years > 0) {
      cagr = Math.pow(finalEquity / initialEquity, 1 / years) - 1;
    }
  }

  // Simplified Sharpe Ratio (assuming risk-free rate = 0 for backtest simplicity)
  // Compute daily returns from equity curve (assuming 1 candle = 1 day for basic calc or approximation)
  // For a robust sharpe, we'd need exact daily resampled equity. Instead we'll estimate variance of step-by-step returns.
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const ret = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
    returns.push(ret);
  }

  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length > 0 ? returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length : 0;
  const stdDev = Math.sqrt(variance);

  // Annualizing Sharpe factor, assuming daily data ~ 252 trading days.
  const sharpeRatio = stdDev === 0 ? 0 : (meanReturn / stdDev) * Math.sqrt(252);

  return {
    finalEquity,
    netProfit,
    maxDrawdown,
    winRate,
    profitFactor,
    sharpeRatio,
    cagr
  };
}
