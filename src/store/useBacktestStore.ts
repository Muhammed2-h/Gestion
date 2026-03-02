import { create } from 'zustand';
import type { BacktestResult } from '../engine/types';

interface BacktestStore {
  isBacktesting: boolean;
  result: BacktestResult | null;
  progress: number;
  setBacktesting: (isTesting: boolean) => void;
  setResult: (result: BacktestResult | null) => void;
  setProgress: (progress: number) => void;
}

export const useBacktestStore = create<BacktestStore>((set) => ({
  isBacktesting: false,
  result: null,
  progress: 0,
  setBacktesting: (isTesting) => set({ isBacktesting: isTesting }),
  setResult: (result) => set({ result }),
  setProgress: (progress) => set({ progress }),
}));
