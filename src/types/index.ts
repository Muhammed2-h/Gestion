// ─── Core Domain Types ───────────────────────────────────────────────────────

export type Exchange = 'NSE' | 'BSE'
export type AccountType = 'equity' | 'fno' | 'mf' | 'cash'
export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND'

export interface Account {
  id: string
  name: string
  broker_name: string
  type: AccountType
  is_api_synced: boolean
  api_key?: string
  api_secret?: string
  api_status?: 'connected' | 'error' | 'pending'
  last_synced?: string
  created_at: string
}

export interface Transaction {
  id: string
  account_id: string
  symbol: string
  exchange: Exchange
  type: TransactionType
  quantity: number
  price: number
  brokerage: number
  stt: number
  exchange_charges: number
  gst: number
  transaction_date: string
  // computed
  total_cost?: number
}

export interface Holding {
  id: string
  symbol: string
  exchange: Exchange
  total_quantity: number
  average_price: number
  current_price: number
  current_value: number
  invested_value: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
  account_id: string
  account_name?: string
  sector?: string
  day_change?: number
  day_change_pct?: number
}

export interface Dividend {
  id: string
  symbol: string
  amount: number
  tds_deducted: number
  payment_date: string
}

export interface Goal {
  id: string
  name: string
  target_amount: number
  target_date: string
  current_amount?: number
  progress_pct?: number
}

export interface MarketQuote {
  symbol: string
  exchange: Exchange
  open: number
  high: number
  low: number
  close: number
  ltp: number
  volume: number
  change: number
  change_pct: number
  timestamp: string
}

export interface PortfolioSummary {
  total_invested: number
  current_value: number
  total_pnl: number
  total_pnl_pct: number
  day_pnl: number
  day_pnl_pct: number
  cagr: number
  xirr: number
}

export interface TaxReport {
  financial_year: string
  stcg: number
  ltcg: number
  total_dividend: number
  total_tds: number
  stt_paid: number
  total_charges: number
}

export interface SectorAllocation {
  sector: string
  value: number
  pct: number
  color: string
}

export interface AnalyticsData {
  absoluteReturn: number
  cagr: number
  xirr: number
  drawdown: number
  volatility: number
  bestDay: { date: string; pct: number }
  worstDay: { date: string; pct: number }
}

export interface DataSource {
  id: 'YAHOO' | 'NSE_BSE' | 'ALPHAVANTAGE' | 'AMFI' | 'BROKER_API' | 'MANUAL'
  name: string
  description: string
  requiresKey: boolean
  isEnabled: boolean
}

export interface BrokerIntegration {
  broker: string
  apiKey: string
  isConnected: boolean
  lastSynced?: string
}

// ─── UI / Store Types ─────────────────────────────────────────────────────────

export interface AppSettings {
  base_currency: string
  date_format: string
  data_source: string
  theme: 'dark' | 'light'
}

export type NavItem = {
  label: string
  path: string
  icon: string
  section?: string
}

// ─── Watchlist & Alerts ───────────────────────────────────────────────────────

export type AlertCondition = 'above' | 'below' | 'crosses_above' | 'crosses_below'

export interface PriceAlert {
  id: string
  symbol: string
  exchange: Exchange
  condition: AlertCondition
  targetPrice: number
  note: string
  triggered: boolean
  triggeredAt?: string
  createdAt: string
}

export interface WatchlistItem {
  id: string
  symbol: string
  exchange: Exchange
  displayName?: string
  addedAt: string
  // live data (not persisted)
  ltp?: number
  open?: number
  high?: number
  low?: number
  volume?: number
  dayChange?: number
  dayChangePct?: number
  high52w?: number
  low52w?: number
  lastUpdated?: string
}

