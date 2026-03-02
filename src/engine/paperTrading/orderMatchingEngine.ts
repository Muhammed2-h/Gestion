import type {  Order, Candle, Trade  } from '../types';

export class OrderMatchingEngine {
  private activeOrders: Order[] = [];
  private orderHistory: Order[] = [];
  
  public submitOrder(order: Order) {
    this.activeOrders.push(order);
  }

  public getActiveOrders(): Order[] {
    return this.activeOrders;
  }

  public getOrderHistory(): Order[] {
    return this.orderHistory;
  }

  public matchOrders(candle: Candle): Trade[] {
    const executedTrades: Trade[] = [];
    const remainingOrders: Order[] = [];

    for (let i = 0; i < this.activeOrders.length; i++) {
        const order = this.activeOrders[i];
        
        switch (order.type) {
            case 'market':
                // Execute immediately at close price.
                executedTrades.push(this.executeOrder(order, candle.close, candle.time));
                break;
                
            case 'limit':
                if (order.price) {
                  if (order.side === 'buy' && candle.low <= order.price) {
                     // Executed at Limit Price or better
                     executedTrades.push(this.executeOrder(order, order.price, candle.time));
                  } else if (order.side === 'sell' && candle.high >= order.price) {
                     executedTrades.push(this.executeOrder(order, order.price, candle.time));
                  } else {
                     remainingOrders.push(order);
                  }
                }
                break;
                
            case 'stop':
                if (order.stopPrice) {
                  if (order.side === 'buy' && candle.high >= order.stopPrice) {
                     // Executed at Stop Price or worse
                     executedTrades.push(this.executeOrder(order, order.stopPrice, candle.time));
                  } else if (order.side === 'sell' && candle.low <= order.stopPrice) {
                     executedTrades.push(this.executeOrder(order, order.stopPrice, candle.time));
                  } else {
                     remainingOrders.push(order);
                  }
                }
                break;
                
            default:
                remainingOrders.push(order);
                break;
        }
    }

    this.activeOrders = remainingOrders;
    return executedTrades;
  }

  private executeOrder(order: Order, fillPrice: number, time: number): Trade {
    order.status = 'filled';
    order.filledQuantity = order.quantity;
    order.averageFillPrice = fillPrice;
    this.orderHistory.push(order);

    return {
        id: `TR-${Math.random().toString(36).substr(2, 9)}`,
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: order.filledQuantity,
        price: fillPrice,
        commission: order.quantity * fillPrice * 0.001, // 0.1% mock commission
        timestamp: time
    };
  }
}
