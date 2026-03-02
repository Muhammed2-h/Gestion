import { calculateMetrics } from './performanceMetrics';
import type { 
  Candle,
  BaseStrategy,
  BacktestConfig,
  BacktestResult,
  Trade,
  Position,
  OrderSide
 } from '../types';

export class BacktestEngine {
  private _equityCurve: { time: number; equity: number }[] = [];
  private _trades: Trade[] = [];
  private _positions: Map<string, Position> = new Map();
  private _capital: number;
  private _initialCapital: number;
  private _config: BacktestConfig;

  constructor(config: BacktestConfig) {
    this._config = config;
    this._initialCapital = config.initialCapital;
    this._capital = config.initialCapital;
  }

  public run(candles: Candle[], strategy: BaseStrategy): BacktestResult {
    strategy.reset();

    for (const candle of candles) {
      // 1. Update existing positions marked-to-market
      this.markToMarket(candle);

      // 2. Feed candle to strategy
      strategy.onCandle(candle);

      // 3. Get signal
      const signal = strategy.generateSignal();

      // 4. Process Signal
      if (signal && signal.type !== 'HOLD') {
        this.processSignal(signal, candle);
      }

      // 5. Snapshot Equity
      const currentEquity = this.calculateEquity();
      this._equityCurve.push({ time: candle.time, equity: currentEquity });
    }

    // 6. Close open positions at the end of the simulation for accurate metrics
    const lastCandle = candles[candles.length - 1];
    if (lastCandle) {
      for (const [, position] of this._positions.entries()) {
        this.closePosition(position, lastCandle.close, lastCandle.time);
      }
      this.markToMarket(lastCandle);
      const finalEq = this.calculateEquity();
      this._equityCurve.push({ time: lastCandle.time, equity: finalEq }); // final snapshot
    }

    // 7. Calculate metrics
    const metrics = calculateMetrics(this._initialCapital, this._equityCurve, this._trades);

    return {
      trades: this._trades,
      equityCurve: this._equityCurve,
      ...metrics,
    };
  }

  private markToMarket(candle: Candle) {
    for (const [, position] of this._positions.entries()) {
      if (position.side === 'buy') {
        position.unrealizedPnl = (candle.close - position.averageEntryPrice) * position.quantity;
      } else {
        // Short position
        position.unrealizedPnl = (position.averageEntryPrice - candle.close) * position.quantity;
      }
    }
  }

  private processSignal(signal: { type: string, symbol: string, price: number }, candle: Candle) {
    const isBuy = signal.type === 'BUY';
    const existingPosition = this._positions.get(signal.symbol);

    // Simplest logic: always close existing opposite side, then open new side if applicable.
    if (existingPosition) {
      if (existingPosition.side === (isBuy ? 'buy' : 'sell')) {
        // Already in position, maybe scale in? Ignoring for basic backtester.
        return;
      } else {
        // Close opposite position first
        this.closePosition(existingPosition, candle.close, candle.time);
      }
    }

    // Open new position
    this.openPosition(signal.symbol, isBuy ? 'buy' : 'sell', candle.close, candle.time);
  }

  private calculatePositionSize(price: number): number {
    const equity = this.calculateEquity();
    if (this._config.positionSizingType === 'fixed_amount') {
      return this._config.positionSizeValue / price;
    } else {
      // fractional
      const allocatedCapital = equity * (this._config.positionSizeValue / 100);
      return allocatedCapital / price;
    }
  }

  private openPosition(symbol: string, side: OrderSide, price: number, _time: number) { // eslint-disable-line
    // Apply slippage
    const executionPrice = side === 'buy' ? price * (1 + this._config.slippagePct / 100) : price * (1 - this._config.slippagePct / 100);
    const quantity = this.calculatePositionSize(executionPrice);
    
    if (quantity <= 0) return; // Can't afford

    const commission = (executionPrice * quantity) * (this._config.commissionPct / 100);
    const tradeCost = side === 'buy' ? (executionPrice * quantity) + commission : commission; // For shorts, we receive cash, pay commission
    
    // For simplicity, deduction logic assumes margin account for robust shorting.
    if (side === 'buy' && this._capital < tradeCost) {
      // Reject trade if insufficient capital for strictly going long. Basic check.
      // In a real margin engine, initial margin would be checked.
      return;
    }

    if (side === 'buy') {
      this._capital -= (executionPrice * quantity) + commission;
    } else {
      this._capital += (executionPrice * quantity) - commission;
    }

    this._positions.set(symbol, {
      symbol,
      side,
      quantity,
      averageEntryPrice: executionPrice,
      unrealizedPnl: 0,
      realizedPnl: 0
    });
  }

  private closePosition(position: Position, price: number, time: number) { // eslint-disable-line
    const executionPrice = position.side === 'sell' ? price * (1 + this._config.slippagePct / 100) : price * (1 - this._config.slippagePct / 100);
    const commission = (executionPrice * position.quantity) * (this._config.commissionPct / 100);

    const grossPnl = position.side === 'buy' 
      ? (executionPrice - position.averageEntryPrice) * position.quantity
      : (position.averageEntryPrice - executionPrice) * position.quantity;

    const netPnl = grossPnl - commission;

    // Settle cash
    if (position.side === 'buy') {
      this._capital += (executionPrice * position.quantity) - commission;
    } else {
      this._capital -= (executionPrice * position.quantity) + commission;
    }

    this._trades.push({
      id: Math.random().toString(), // MOCK id
      orderId: 'BT-' + Math.random().toString(),
      symbol: position.symbol,
      side: position.side === 'buy' ? 'sell' : 'buy', // The closing trade
      quantity: position.quantity,
      price: executionPrice,
      commission,
      timestamp: time,
      pnl: netPnl
    });

    this._positions.delete(position.symbol);
  }

  private calculateEquity(): number {
    let eq = this._capital;
    for (const pos of this._positions.values()) {
      if (pos.side === 'buy') {
         eq += pos.quantity * pos.averageEntryPrice + pos.unrealizedPnl;
      } else {
         eq -= pos.quantity * pos.averageEntryPrice - pos.unrealizedPnl; // basic short accounting
      }
    }
    return eq;
  }
}
