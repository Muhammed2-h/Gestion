import { RSI } from 'technicalindicators';
import { AbstractStrategy } from './baseStrategy';
import type {  Candle, Signal, StrategyConfig  } from '../types';

export class RsiReversalStrategy extends AbstractStrategy {
  private rsiPeriod: number;
  private overSold: number;
  private overBought: number;
  private rsiEngine: RSI;
  private currentRsi: number | undefined;
  private lastRsi: number | undefined;
  private symbol: string;

  constructor(id: string, name: string, config: StrategyConfig) {
    super(id, name, config);
    this.rsiPeriod = Number(config.rsiPeriod) || 14;
    this.overSold = Number(config.overSold) || 30;
    this.overBought = Number(config.overBought) || 70;
    this.symbol = String(config.symbol) || 'UNKNOWN';

    this.rsiEngine = new RSI({ period: this.rsiPeriod, values: [] });
  }

  protected processCandle(candle: Candle): void {
    const rsiVal = this.rsiEngine.nextValue(candle.close);
    if (rsiVal !== undefined) {
      this.lastRsi = this.currentRsi;
      this.currentRsi = rsiVal;
    }
  }

  public generateSignal(): Signal {
    const defaultHold: Signal = { type: 'HOLD', symbol: this.symbol, price: 0, timestamp: 0 };
    if (!this.candles.length) return defaultHold;
    
    const lastCandle = this.candles[this.candles.length - 1];
    defaultHold.price = lastCandle.close;
    defaultHold.timestamp = lastCandle.time;

    if (this.currentRsi !== undefined && this.lastRsi !== undefined) {
      // Reversal coming OUT of oversold = BUY
      if (this.lastRsi <= this.overSold && this.currentRsi > this.overSold) {
        return {
          type: 'BUY',
          symbol: this.symbol,
          price: lastCandle.close,
          timestamp: lastCandle.time,
          reason: 'RSI Reversal from Oversold'
        };
      }

      // Reversal coming OUT of overbought = SELL
      if (this.lastRsi >= this.overBought && this.currentRsi < this.overBought) {
        return {
          type: 'SELL',
          symbol: this.symbol,
          price: lastCandle.close,
          timestamp: lastCandle.time,
          reason: 'RSI Reversal from Overbought'
        };
      }
    }

    return defaultHold;
  }

  protected onReset(): void {
    this.rsiEngine = new RSI({ period: this.rsiPeriod, values: [] });
    this.lastRsi = undefined;
    this.currentRsi = undefined;
  }
}
