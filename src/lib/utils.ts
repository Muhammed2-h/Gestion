// ─── Utility Functions ────────────────────────────────────────────────────────
// All Intl formatters are cached at module level to avoid re-instantiation
// on every call (each new Intl.* costs ~0.1–0.5ms).

// ─── Cached Intl formatters ───────────────────────────────────────────────────

const INR_FULL = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const DATE_FMT = new Intl.DateTimeFormat('en-IN', {
  day:   '2-digit',
  month: 'short',
  year:  'numeric',
})

const DATE_TIME_FMT = new Intl.DateTimeFormat('en-IN', {
  day:    '2-digit',
  month:  'short',
  year:   'numeric',
  hour:   '2-digit',
  minute: '2-digit',
})

// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Format a rupee amount.
 * @param compact  When true, uses Indian denomination shortcuts (Cr / L / K).
 * @param signed   When true, prepend '+' for positive amounts.
 */
export function formatCurrency(amount: number, compact = false, signed = false): string {
  const sign = signed && amount > 0 ? '+' : ''
  if (compact) {
    const abs = Math.abs(amount)
    const neg = amount < 0 ? '-' : sign
    if (abs >= 1_00_00_000) return `${neg}₹${(abs / 1_00_00_000).toFixed(2)}Cr`
    if (abs >= 1_00_000)    return `${neg}₹${(abs / 1_00_000).toFixed(2)}L`
    if (abs >= 1000)        return `${neg}₹${(abs / 1000).toFixed(1)}K`
  }
  return `${sign}${INR_FULL.format(amount)}`
}

// ─── Percentage ───────────────────────────────────────────────────────────────

export function formatPct(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

// ─── Dates ────────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—'
  try {
    return DATE_FMT.format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '—'
  try {
    return DATE_TIME_FMT.format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

// ─── ID generation ───────────────────────────────────────────────────────────
// Use crypto.randomUUID() when available (collision-free, cryptographically
// secure). Falls back to timestamp + random for older browsers.

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' pattern
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// ─── XIRR (Extended Internal Rate of Return) ─────────────────────────────────
// Newton-Raphson solver. Used for true portfolio returns.

export function computeXIRR(cashflows: { date: string; amount: number }[]): number {
  if (cashflows.length < 2) return 0
  const PRECISION = 1e-7
  const MAX_ITER  = 100
  const t0 = new Date(cashflows[0].date).getTime()
  // Pre-compute years delta to avoid repeated Date construction in the loop
  const pre = cashflows.map(cf => ({
    amount: cf.amount,
    yr:     (new Date(cf.date).getTime() - t0) / (365.25 * 24 * 60 * 60 * 1000),
  }))

  let rate = 0.1
  for (let i = 0; i < MAX_ITER; i++) {
    let f = 0, df = 0
    for (const { amount, yr } of pre) {
      const v  = Math.pow(1 + rate, yr)
      f  += amount / v
      df -= yr * amount / (v * (1 + rate))
    }
    if (df === 0) break
    const newRate = rate - f / df
    if (Math.abs(newRate - rate) < PRECISION) return newRate * 100
    rate = newRate
  }
  return rate * 100
}

// ─── CAGR ─────────────────────────────────────────────────────────────────────

export function computeCAGR(start: number, end: number, years: number): number {
  if (years <= 0 || start <= 0) return 0
  return (Math.pow(end / start, 1 / years) - 1) * 100
}

// ─── Tax computation (FIFO STCG/LTCG) ────────────────────────────────────────

/** FIFO-based STCG/LTCG tax computation per Indian tax law (1 year cutoff). */
export function computeTaxReport(
  buys:  { quantity: number; price: number; date: string }[],
  sells: { quantity: number; price: number; date: string }[]
): { stcg: number; ltcg: number } {
  // Clone buy lots so we can mutate quantity
  const lots = buys.map(b => ({
    quantity: b.quantity,
    price:    b.price,
    dateMs:   new Date(b.date).getTime(),
  }))
  let stcg = 0, ltcg = 0

  for (const sell of sells) {
    let rem          = sell.quantity
    const sellDateMs = new Date(sell.date).getTime()
    const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000

    for (const lot of lots) {
      if (rem <= 0 || lot.quantity <= 0) continue
      const used = Math.min(lot.quantity, rem)
      const gain = (sell.price - lot.price) * used
      const days = (sellDateMs - lot.dateMs) / (MS_PER_YEAR / 365)
      if (days > 365) ltcg += gain
      else            stcg += gain
      lot.quantity -= used
      rem          -= used
    }
  }
  return { stcg, ltcg }
}

// ─── Broker CSV parsers ───────────────────────────────────────────────────────

/** Flexible CSV → object array parser */
function parseCsv(csvText: string): Record<string, string>[] {
  const lines  = csvText.trim().split(/\r?\n/)
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      // Handle quoted fields with commas inside
      const cols: string[] = []
      let current = '', inQuote = false
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote }
        else if (ch === ',' && !inQuote) { cols.push(current.trim()); current = '' }
        else { current += ch }
      }
      cols.push(current.trim())
      const row: Record<string, string> = {}
      header.forEach((h, i) => { row[h] = cols[i] ?? '' })
      return row
    })
}

/** Parse Zerodha tradebook CSV */
export function parseZerodhaCsv(csvText: string) {
  return parseCsv(csvText).map(row => ({
    symbol:           row['symbol']       || row['trade symbol'] || row['scrip']      || '',
    exchange:         (row['exchange']    || 'NSE').toUpperCase(),
    type:             (row['trade type']  || row['type']         || 'BUY').toUpperCase() as 'BUY' | 'SELL',
    quantity:         parseFloat(row['quantity']          || row['qty']        || '0'),
    price:            parseFloat(row['price']             || row['trade price'] || row['avg price'] || '0'),
    transaction_date: row['trade date']  || row['date'] || new Date().toISOString().split('T')[0],
    brokerage:        parseFloat(row['brokerage']         || '0'),
    stt:              parseFloat(row['stt']               || '0'),
    exchange_charges: parseFloat(row['exchange charges']  || row['exchange charge'] || '0'),
    gst:              parseFloat(row['gst']               || '0'),
  })).filter(r => r.symbol && r.quantity > 0 && r.price > 0)
}

/** Parse Upstox tradebook CSV (slight column name differences) */
export function parseUpstoxCsv(csvText: string) {
  return parseCsv(csvText).map(row => ({
    symbol:           row['instrument']  || row['symbol']   || '',
    exchange:         (row['exchange']   || 'NSE').toUpperCase(),
    type:             (row['buy/sell']   || row['type']     || 'BUY').toUpperCase() as 'BUY' | 'SELL',
    quantity:         parseFloat(row['qty']      || row['quantity'] || '0'),
    price:            parseFloat(row['avg. price'] || row['price']  || '0'),
    transaction_date: row['date']        || new Date().toISOString().split('T')[0],
    brokerage:        parseFloat(row['brokerage'] || '0'),
    stt:              parseFloat(row['stt']       || '0'),
    exchange_charges: parseFloat(row['txn charges'] || '0'),
    gst:              parseFloat(row['gst']       || '0'),
  })).filter(r => r.symbol && r.quantity > 0 && r.price > 0)
}

// ─── Number helpers ───────────────────────────────────────────────────────────

/** Clamp a number between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Round to a given number of decimal places. */
export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/** Check if a value is a finite, non-NaN number. */
export function isValidNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v) && !isNaN(v)
}
