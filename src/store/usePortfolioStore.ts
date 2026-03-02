import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {  Position, Trade, Order  } from '../engine/types';

interface PortfolioState {
  capital: number;
  equity: number;
  positions: Position[];
  trades: Trade[];
  activeOrders: Order[];
  
  initialize: (initialCapital: number) => void;
  updateData: (capital: number, equity: number, positions: Position[], trades: Trade[], activeOrders: Order[]) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      capital: 100000,
      equity: 100000,
      positions: [],
      trades: [],
      activeOrders: [],
      
      initialize: (initialCapital: number) => set({
        capital: initialCapital,
        equity: initialCapital,
        positions: [],
        trades: [],
        activeOrders: []
      }),

      updateData: (capital, equity, positions, trades, activeOrders) => set({
        capital,
        equity,
        positions,
        trades,
        activeOrders
      })
    }),
    {
      name: 'trading-portfolio-storage'
    }
  )
);
