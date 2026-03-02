import type { Position, Trade } from '../types';

export class PortfolioEngine {
  private currentCapital: number;
  private positions: Map<string, Position>;
  private trades: Trade[];
  
  constructor(initialCapital: number) {
    this.currentCapital = initialCapital;
    this.positions = new Map();
    this.trades = [];
  }

  public getCapital(): number {
    return this.currentCapital;
  }

  public getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  public getTrades(): Trade[] {
    return this.trades;
  }

  public executeTrade(trade: Trade) {
    this.trades.push(trade);

    const isBuy = trade.side === 'buy';
    const cost = trade.price * trade.quantity;

    // Cash accounting
    if (isBuy) {
      this.currentCapital -= (cost + trade.commission);
    } else {
      this.currentCapital += (cost - trade.commission);
    }

    // Positions accounting
    const existingPosition = this.positions.get(trade.symbol);
    
    if (!existingPosition) {
      this.positions.set(trade.symbol, {
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        averageEntryPrice: trade.price,
        unrealizedPnl: 0,
        realizedPnl: 0
      });
    } else {
      // Re-evaluate existing position
      if (existingPosition.side === trade.side) {
        // Adding to position
        const totalValue = (existingPosition.quantity * existingPosition.averageEntryPrice) + cost;
        existingPosition.quantity += trade.quantity;
        existingPosition.averageEntryPrice = totalValue / existingPosition.quantity;
      } else {
        // Reducing or closing position
        if (trade.quantity === existingPosition.quantity) {
          // Full close
          this.positions.delete(trade.symbol);
        } else if (trade.quantity < existingPosition.quantity) {
          // Partial close
          existingPosition.quantity -= trade.quantity;
        } else {
          // Reversal
          const remainingQuantity = trade.quantity - existingPosition.quantity;
          this.positions.set(trade.symbol, {
            symbol: trade.symbol,
            side: trade.side,
            quantity: remainingQuantity,
            averageEntryPrice: trade.price,
            unrealizedPnl: 0,
            realizedPnl: existingPosition.realizedPnl
          });
        }
      }
    }
  }

  public markToMarket(symbol: string, currentPrice: number) {
    const position = this.positions.get(symbol);
    if (!position) return;

    if (position.side === 'buy') {
      position.unrealizedPnl = (currentPrice - position.averageEntryPrice) * position.quantity;
    } else {
      position.unrealizedPnl = (position.averageEntryPrice - currentPrice) * position.quantity;
    }
  }

  public getEquity(): number {
    let eq = this.currentCapital;
    for (const pos of this.positions.values()) {
      if (pos.side === 'buy') {
        eq += pos.quantity * pos.averageEntryPrice + pos.unrealizedPnl;
      } else {
        eq -= pos.quantity * pos.averageEntryPrice - pos.unrealizedPnl;
      }
    }
    return eq;
  }
}
