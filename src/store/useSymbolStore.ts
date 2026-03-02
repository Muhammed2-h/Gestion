import { create } from 'zustand';

interface SymbolStore {
  symbol: string;
  setSymbol: (symbol: string) => void;
}

export const useSymbolStore = create<SymbolStore>((set) => ({
  symbol: 'AAPL',
  setSymbol: (symbol: string) => set({ symbol }),
}));
