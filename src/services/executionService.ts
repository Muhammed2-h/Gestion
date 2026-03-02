import type { Order, OrderType, OrderSide } from '../engine/types';
import { PortfolioEngine } from '../engine/paperTrading/portfolioEngine';
import { OrderMatchingEngine } from '../engine/paperTrading/orderMatchingEngine';
import { RiskManager } from '../engine/paperTrading/riskManager';

type TradingMode = 'LIVE' | 'BACKTEST';

export class ExecutionService {
  private static instance: ExecutionService;
  
  private mode: TradingMode = 'LIVE';
   // default

  // Dedicated core live/paper
  private portfolio: PortfolioEngine;
  private matcher: OrderMatchingEngine;
  private risk: RiskManager;

  private constructor() {
    this.portfolio = new PortfolioEngine(100000); // Start with $100k
    this.matcher = new OrderMatchingEngine();
    this.risk = new RiskManager({ maxPositionSizePct: 20, maxDailyLoss: 5000 });
  }

  public static getInstance(): ExecutionService {
    if (!ExecutionService.instance) {
      ExecutionService.instance = new ExecutionService();
    }
    return ExecutionService.instance;
  }

  public setMode(mode: TradingMode) {
    this.mode = mode;
  }

  public getMode(): TradingMode {
    return this.mode;
  }

  public async submitOrder(symbol: string, side: OrderSide, quantity: number, type: OrderType, price?: number, stopPrice?: number): Promise<Order | null> {
    const order: Order = {
      id: `ORD-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side,
      type,
      quantity,
      price,
      stopPrice,
      status: 'pending',
      filledQuantity: 0,
      averageFillPrice: 0,
      timestamp: Date.now(),
      commission: 0
    };

    if (this.mode === 'LIVE') {
        const isValid = this.risk.validateOrder(order, this.portfolio);
        if (!isValid) {
            order.status = 'rejected';
            return order;
        }
        
        // Push to matching engine for LIVE Paper Trading stream
        this.matcher.submitOrder(order);
        return order;
    } else {
        // Backtest Mode directly handled by `BacktestEngine` internally during iteration
        // ExecutionService simply provides the shared type model to UI
        return null;
    }
  }

  public onMarketData(symbol: string, currentPrice: number, time: number) {
      if (this.mode === 'LIVE') {
          // Synthetic basic candle out of tick
          const mtCandle = {
             time,
             open: currentPrice,
             high: currentPrice,
             low: currentPrice,
             close: currentPrice
          };

          const matchedTrades = this.matcher.matchOrders(mtCandle);
          for (const trade of matchedTrades) {
             this.portfolio.executeTrade(trade);
          }
          
          this.portfolio.markToMarket(symbol, currentPrice);
      }
  }

  public getPortfolio() {
     return this.portfolio;
  }
}
