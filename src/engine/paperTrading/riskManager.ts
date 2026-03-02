import type { Order } from '../types';
import { PortfolioEngine } from './portfolioEngine';

export interface RiskConfig {
  maxPositionSizePct: number; // Max size per trade based on equity
  maxDailyLoss: number; // Flatten portfolio if daily loss > value
}

export class RiskManager {
  private config: RiskConfig;

  constructor(config: RiskConfig) {
    this.config = config;
  }

  public validateOrder(order: Order, portfolio: PortfolioEngine): boolean {
    const equity = portfolio.getEquity();

    // Check position sizing limits
    const maxSizeVal = equity * (this.config.maxPositionSizePct / 100);
    const estCost = order.quantity * (order.price || 0);

    if (estCost > maxSizeVal) {
      console.warn(`RiskManager: Order size ${estCost} exceeds max position size: ${maxSizeVal}.`);
      return false; // Rejected
    }

    // Checking if we exceed capital for long trades
    if (order.side === 'buy' && portfolio.getCapital() < estCost) {
       console.warn(`RiskManager: Insufficient capital. Required ${estCost}. Found ${portfolio.getCapital()}`);
       return false;
    }

    return true; // Validated
  }

  public checkDrawdown(_portfolio: PortfolioEngine): boolean {
    // Returns true if drawdown is safe. If false, positions should be closed.
    // Daily loss check could be implemented here. Assuming daily starting capital tracking.
    return true; // Simplification for now
  }
}
