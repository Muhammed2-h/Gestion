import { EMA } from 'technicalindicators';
import { AbstractStrategy } from './baseStrategy';
import type {  Candle, Signal, StrategyConfig  } from '../types';

export class EmaCrossoverStrategy extends AbstractStrategy {
  private fastEma: EMA;
  private slowEma: EMA;
  private fastPeriod: number;
  private slowPeriod: number;
  private lastFastValue: number | undefined;
  private lastSlowValue: number | undefined;
  private currentFastValue: number | undefined;
  private currentSlowValue: number | undefined;
  private symbol: string;

  constructor(id: string, name: string, config: StrategyConfig) {
    super(id, name, config);
    this.fastPeriod = Number(config.fastPeriod) || 9;
    this.slowPeriod = Number(config.slowPeriod) || 21;
    this.symbol = String(config.symbol) || 'UNKNOWN';

    this.fastEma = new EMA({ period: this.fastPeriod, values: [] });
    this.slowEma = new EMA({ period: this.slowPeriod, values: [] });
  }

  protected processCandle(candle: Candle): void {
    const fastRes = this.fastEma.nextValue(candle.close);
    const slowRes = this.slowEma.nextValue(candle.close);

    if (fastRes !== undefined) {
      this.lastFastValue = this.currentFastValue;
      this.currentFastValue = fastRes;
    }

    if (slowRes !== undefined) {
      this.lastSlowValue = this.currentSlowValue;
      this.currentSlowValue = slowRes;
    }
  }

  public generateSignal(): Signal {
    const defaultHold: Signal = { type: 'HOLD', symbol: this.symbol, price: 0, timestamp: 0 };

    if (!this.candles.length) return defaultHold;
    const lastCandle = this.candles[this.candles.length - 1];
    defaultHold.price = lastCandle.close;
    defaultHold.timestamp = lastCandle.time;

    if (
      this.currentFastValue !== undefined &&
      this.currentSlowValue !== undefined &&
      this.lastFastValue !== undefined &&
      this.lastSlowValue !== undefined
    ) {
      // Bullish Crossover
      if (this.lastFastValue <= this.lastSlowValue && this.currentFastValue > this.currentSlowValue) {
        return {
          type: 'BUY',
          symbol: this.symbol,
          price: lastCandle.close,
          timestamp: lastCandle.time,
          reason: 'EMA Bullish Crossover'
        };
      }

      // Bearish Crossover
      if (this.lastFastValue >= this.lastSlowValue && this.currentFastValue < this.currentSlowValue) {
        return {
          type: 'SELL',
          symbol: this.symbol,
          price: lastCandle.close,
          timestamp: lastCandle.time,
          reason: 'EMA Bearish Crossover'
        };
      }
    }

    return defaultHold;
  }

  protected onReset(): void {
    this.fastEma = new EMA({ period: this.fastPeriod, values: [] });
    this.slowEma = new EMA({ period: this.slowPeriod, values: [] });
    this.lastFastValue = undefined;
    this.lastSlowValue = undefined;
    this.currentFastValue = undefined;
    this.currentSlowValue = undefined;
  }
}
