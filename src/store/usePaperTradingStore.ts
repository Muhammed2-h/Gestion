import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PaperPosition {
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  marketValue: number;
}

export interface PaperTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  commission: number;
  pnl: number; // realized P&L (non-zero on close/reduce)
  timestamp: number;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  status: 'pending' | 'filled' | 'cancelled';
  filledPrice?: number;
  timestamp: number;
}

const COMMISSION_PCT = 0.05; // 0.05% brokerage
const INITIAL_CAPITAL = 100_000;

interface PaperTradingState {
  capital: number;
  positions: PaperPosition[];
  orders: PaperOrder[];
  tradeHistory: PaperTrade[];

  // Fill a market order at the given price
  submitMarketOrder: (
    symbol: string,
    side: 'buy' | 'sell',
    quantity: number,
    currentPrice: number
  ) => { ok: boolean; message: string };

  // Submit limit/stop (parks as pending, fills when price crosses)
  submitLimitOrder: (
    symbol: string,
    side: 'buy' | 'sell',
    quantity: number,
    type: 'limit' | 'stop',
    triggerPrice: number
  ) => void;

  // Check pending orders against latest price and fill if triggered
  processPendingOrders: (symbol: string, currentPrice: number) => void;

  // Update unrealized P&L for all positions
  updatePositionPrices: (symbol: string, currentPrice: number) => void;

  // Close (flatten) a position entirely
  closePosition: (symbol: string, currentPrice: number) => void;

  // Reset account
  resetAccount: () => void;

  // Computed helpers
  totalEquity: () => number;
  totalUnrealizedPnl: () => number;
}

function calcCommission(value: number) {
  return Math.max(0.01, value * (COMMISSION_PCT / 100));
}

export const usePaperTradingStore = create<PaperTradingState>()(
  persist(
    (set, get) => ({
      capital: INITIAL_CAPITAL,
      positions: [],
      orders: [],
      tradeHistory: [],

      totalEquity: () => {
        const s = get();
        const posValue = s.positions.reduce(
          (sum, p) => sum + p.marketValue,
          0
        );
        return s.capital + posValue;
      },

      totalUnrealizedPnl: () =>
        get().positions.reduce((sum, p) => sum + p.unrealizedPnl, 0),

      submitMarketOrder: (symbol, side, quantity, currentPrice) => {
        if (quantity <= 0) return { ok: false, message: 'Quantity must be > 0' };
        if (currentPrice <= 0) return { ok: false, message: 'No live price — wait for feed' };

        const tradeValue = quantity * currentPrice;
        const commission = calcCommission(tradeValue);
        const totalCost = side === 'buy' ? tradeValue + commission : 0;

        const { capital, positions } = get();

        if (side === 'buy' && capital < totalCost) {
          return { ok: false, message: `Insufficient capital ($${capital.toFixed(2)} < $${totalCost.toFixed(2)})` };
        }

        let realizedPnl = 0;
        let newCapital = capital;
        let newPositions = [...positions];

        const existing = newPositions.find(p => p.symbol === symbol);

        if (side === 'buy') {
          newCapital -= totalCost;
          if (existing && existing.side === 'long') {
            // Add to long
            const newQty = existing.quantity + quantity;
            const newAvg = (existing.avgEntryPrice * existing.quantity + currentPrice * quantity) / newQty;
            existing.quantity = newQty;
            existing.avgEntryPrice = newAvg;
            existing.currentPrice = currentPrice;
            existing.marketValue = newQty * currentPrice;
            existing.unrealizedPnl = (currentPrice - newAvg) * newQty;
            existing.unrealizedPnlPct = (currentPrice - newAvg) / newAvg * 100;
          } else if (existing && existing.side === 'short') {
            // Close short
            const closeQty = Math.min(quantity, existing.quantity);
            realizedPnl = (existing.avgEntryPrice - currentPrice) * closeQty - commission;
            newCapital += existing.avgEntryPrice * closeQty; // return collateral
            existing.quantity -= closeQty;
            if (existing.quantity <= 0) {
              newPositions = newPositions.filter(p => p.symbol !== symbol);
            } else {
              existing.currentPrice = currentPrice;
              existing.marketValue = existing.quantity * currentPrice;
              existing.unrealizedPnl = (existing.avgEntryPrice - currentPrice) * existing.quantity;
              existing.unrealizedPnlPct = (existing.avgEntryPrice - currentPrice) / existing.avgEntryPrice * 100;
            }
          } else {
            // New long position
            newPositions.push({
              symbol, side: 'long', quantity, avgEntryPrice: currentPrice,
              currentPrice, marketValue: quantity * currentPrice,
              unrealizedPnl: 0, unrealizedPnlPct: 0,
            });
          }
        } else {
          // SELL
          if (existing && existing.side === 'long') {
            // Close / reduce long
            const closeQty = Math.min(quantity, existing.quantity);
            realizedPnl = (currentPrice - existing.avgEntryPrice) * closeQty - commission;
            newCapital += currentPrice * closeQty - commission;
            existing.quantity -= closeQty;
            if (existing.quantity <= 0) {
              newPositions = newPositions.filter(p => p.symbol !== symbol);
            } else {
              existing.currentPrice = currentPrice;
              existing.marketValue = existing.quantity * currentPrice;
              existing.unrealizedPnl = (currentPrice - existing.avgEntryPrice) * existing.quantity;
              existing.unrealizedPnlPct = (currentPrice - existing.avgEntryPrice) / existing.avgEntryPrice * 100;
            }
          } else {
            // Short sell — add margin requirement
            if (capital < tradeValue * 0.2) {
              return { ok: false, message: 'Insufficient margin for short' };
            }
            newCapital -= commission;
            if (existing && existing.side === 'short') {
              const newQty = existing.quantity + quantity;
              const newAvg = (existing.avgEntryPrice * existing.quantity + currentPrice * quantity) / newQty;
              existing.quantity = newQty;
              existing.avgEntryPrice = newAvg;
              existing.currentPrice = currentPrice;
              existing.marketValue = newQty * currentPrice;
              existing.unrealizedPnl = (existing.avgEntryPrice - currentPrice) * newQty;
              existing.unrealizedPnlPct = (existing.avgEntryPrice - currentPrice) / existing.avgEntryPrice * 100;
            } else {
              newPositions.push({
                symbol, side: 'short', quantity, avgEntryPrice: currentPrice,
                currentPrice, marketValue: quantity * currentPrice,
                unrealizedPnl: 0, unrealizedPnlPct: 0,
              });
            }
          }
        }

        const trade: PaperTrade = {
          id: Date.now().toString(),
          symbol, side, quantity,
          price: currentPrice, commission,
          pnl: realizedPnl,
          timestamp: Date.now(),
        };

        const order: PaperOrder = {
          id: Date.now().toString() + '_o',
          symbol, side, type: 'market', quantity,
          status: 'filled', filledPrice: currentPrice,
          timestamp: Date.now(),
        };

        set({
          capital: newCapital,
          positions: newPositions,
          tradeHistory: [trade, ...get().tradeHistory].slice(0, 200),
          orders: [order, ...get().orders].slice(0, 200),
        });

        return { ok: true, message: `${side.toUpperCase()} ${quantity} ${symbol} @ $${currentPrice.toFixed(2)}` };
      },

      submitLimitOrder: (symbol, side, quantity, type, triggerPrice) => {
        const order: PaperOrder = {
          id: Date.now().toString() + '_l',
          symbol, side, type, quantity,
          limitPrice: type === 'limit' ? triggerPrice : undefined,
          stopPrice: type === 'stop' ? triggerPrice : undefined,
          status: 'pending',
          timestamp: Date.now(),
        };
        set(s => ({ orders: [order, ...s.orders].slice(0, 200) }));
      },

      processPendingOrders: (symbol, currentPrice) => {
        const { orders, submitMarketOrder } = get();
        const pending = orders.filter(o => o.symbol === symbol && o.status === 'pending');
        if (pending.length === 0) return;

        for (const order of pending) {
          let shouldFill = false;
          if (order.type === 'limit') {
            if (order.side === 'buy' && currentPrice <= (order.limitPrice ?? Infinity)) shouldFill = true;
            if (order.side === 'sell' && currentPrice >= (order.limitPrice ?? 0)) shouldFill = true;
          } else if (order.type === 'stop') {
            if (order.side === 'buy' && currentPrice >= (order.stopPrice ?? Infinity)) shouldFill = true;
            if (order.side === 'sell' && currentPrice <= (order.stopPrice ?? 0)) shouldFill = true;
          }

          if (shouldFill) {
            submitMarketOrder(symbol, order.side, order.quantity, currentPrice);
            set(s => ({
              orders: s.orders.map(o =>
                o.id === order.id ? { ...o, status: 'filled', filledPrice: currentPrice } : o
              ),
            }));
          }
        }
      },

      updatePositionPrices: (symbol, currentPrice) => {
        if (currentPrice <= 0) return;
        set(s => ({
          positions: s.positions.map(p => {
            if (p.symbol !== symbol) return p;
            const unrealizedPnl = p.side === 'long'
              ? (currentPrice - p.avgEntryPrice) * p.quantity
              : (p.avgEntryPrice - currentPrice) * p.quantity;
            const unrealizedPnlPct = p.side === 'long'
              ? (currentPrice - p.avgEntryPrice) / p.avgEntryPrice * 100
              : (p.avgEntryPrice - currentPrice) / p.avgEntryPrice * 100;
            return {
              ...p,
              currentPrice,
              marketValue: p.quantity * currentPrice,
              unrealizedPnl,
              unrealizedPnlPct,
            };
          }),
        }));
      },

      closePosition: (symbol, currentPrice) => {
        const pos = get().positions.find(p => p.symbol === symbol);
        if (!pos) return;
        const side = pos.side === 'long' ? 'sell' : 'buy';
        get().submitMarketOrder(symbol, side, pos.quantity, currentPrice);
      },

      resetAccount: () => set({
        capital: INITIAL_CAPITAL,
        positions: [],
        orders: [],
        tradeHistory: [],
      }),
    }),
    { name: 'paper-trading-v2' }
  )
);
