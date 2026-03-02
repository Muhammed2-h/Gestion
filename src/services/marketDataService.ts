import type {  Candle  } from '../engine/types';

const API_BASE_URL = 'http://localhost:3001/api';

export class MarketDataService {
  public static async fetchHistoricalCandles(symbol: string, period1: string, interval: string = '1d'): Promise<Candle[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/historical?symbol=${symbol}&period1=${period1}&interval=${interval}`);
      if (!response.ok) {
         throw new Error(`Failed to fetch historical data for ${symbol}`);
      }
      const data = await response.json();
      return data as Candle[];
    } catch (error) {
      console.error('MarketDataService Error:', error);
      return [];
    }
  }
}
