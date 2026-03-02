import type {  BaseStrategy, Candle, Signal, StrategyConfig  } from '../types';

export abstract class AbstractStrategy implements BaseStrategy {
  public id: string;
  public name: string;
  public config: StrategyConfig;

  protected candles: Candle[] = [];
  protected lastSignal: Signal | null = null;

  constructor(id: string, name: string, config: StrategyConfig) {
    this.id = id;
    this.name = name;
    this.config = config;
  }

  public onCandle(candle: Candle): void {
    this.candles.push(candle);
    this.processCandle(candle);
  }

  protected abstract processCandle(candle: Candle): void;
  public abstract generateSignal(): Signal;

  public reset(): void {
    this.candles = [];
    this.lastSignal = null;
    this.onReset();
  }

  protected onReset(): void {}
}
