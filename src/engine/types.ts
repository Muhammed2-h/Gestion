export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'filled' | 'canceled' | 'rejected';

export interface Order {
  id: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  quantity: number;
  price?: number; // Needed for limit/stop orders
  stopPrice?: number;
  status: OrderStatus;
  filledQuantity: number;
  averageFillPrice: number;
  timestamp: number;
  commission: number;
}

export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  commission: number;
  timestamp: number;
  pnl?: number;
}

export interface Position {
  symbol: string;
  side: OrderSide;
  quantity: number;
  averageEntryPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

export interface Candle {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type SignalType = 'BUY' | 'SELL' | 'HOLD';

export interface Signal {
  type: SignalType;
  symbol: string;
  price: number;
  timestamp: number;
  confidence?: number;
  reason?: string;
}

export interface StrategyConfig {
  [key: string]: number | string | boolean;
}

export interface BaseStrategy {
  id: string;
  name: string;
  config: StrategyConfig;
  onCandle(candle: Candle): void;
  generateSignal(): Signal;
  reset(): void;
}

export interface BacktestConfig {
  initialCapital: number;
  commissionPct: number;
  slippagePct: number;
  positionSizingType: 'fixed_fractional' | 'fixed_amount';
  positionSizeValue: number; // % of equity or flat amount
}

export interface BacktestResult {
  trades: Trade[];
  finalEquity: number;
  netProfit: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  cagr: number;
  equityCurve: { time: number; equity: number }[];
}
