import { BacktestEngine } from './backtestEngine';
import type {  BaseStrategy, Candle, BacktestConfig, BacktestResult  } from '../types';

export class StrategyRunner {
  public static run(
    candles: Candle[],
    strategy: BaseStrategy,
    config: BacktestConfig
  ): Promise<BacktestResult> {
    return new Promise((resolve, reject) => {
      try {
        // Basic Promise wrapping to allow caller to not freeze strictly on invocation,
        // though the inner loop is still synchronous. For larger datasets, chunking is recommended.
        const engine = new BacktestEngine(config);
        const result = engine.run(candles, strategy);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }
}
