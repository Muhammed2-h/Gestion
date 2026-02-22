// ─── Market Data – Yahoo Finance  ────────────────────────────────────────────
// NSE suffix: .NS  |  BSE suffix: .BO
// All browser-side calls route through CORS proxies, with in-memory
// response caching, request deduplication, and batch API usage.

// ─── CORS Proxy layer ─────────────────────────────────────────────────────────

const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

// Dedup: if the same URL is already in-flight, reuse the same Promise
const IN_FLIGHT = new Map<string, Promise<Response>>()

async function fetchWithProxy(url: string, timeoutMs = 8000): Promise<Response> {
  if (IN_FLIGHT.has(url)) return IN_FLIGHT.get(url)!.then(r => r.clone())

  const attempt = (async () => {
    let lastErr: Error = new Error('All proxies failed')
    // Race the first proxy against 4s; fall back to second simultaneously after 2s
    const results = await Promise.any(
      CORS_PROXIES.map((proxy, i) =>
        new Promise<Response>((resolve, reject) => {
          const delay = i * 2000 // stagger: proxy[0] fires immediately, proxy[1] after 2s
          const timer = setTimeout(() => {
            fetch(proxy(url), { signal: AbortSignal.timeout(timeoutMs) })
              .then(r => { if (r.ok) resolve(r); else reject(new Error(`HTTP ${r.status}`)) })
              .catch(reject)
          }, delay)
          // clean up timer if another proxy resolved first
          return () => clearTimeout(timer)
        })
      )
    ).catch(() => null)

    if (results) return results

    // Fallback: try sequentially if Promise.any failed
    for (const proxy of CORS_PROXIES) {
      try {
        const res = await fetch(proxy(url), { signal: AbortSignal.timeout(timeoutMs) })
        if (res.ok) return res
      } catch (e) { lastErr = e as Error }
    }
    throw lastErr
  })()

  IN_FLIGHT.set(url, attempt)
  attempt.finally(() => IN_FLIGHT.delete(url))
  return attempt
}

function toYahooSymbol(symbol: string, exchange: 'NSE' | 'BSE'): string {
  return `${symbol}${exchange === 'BSE' ? '.BO' : '.NS'}`
}

// ─── Response Cache ────────────────────────────────────────────────────────────
// Two-level TTL cache: quotes = 25s, sector = 24h, news = 5min

interface CacheEntry<T> { value: T; expiresAt: number }

class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>()

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return undefined }
    return entry.value
  }

  set(key: string, value: T, ttlMs: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  has(key: string): boolean { return this.get(key) !== undefined }

  invalidate(key: string) { this.store.delete(key) }

  clear() { this.store.clear() }

  /** Purge all expired entries */
  gc() {
    const now = Date.now()
    for (const [k, v] of this.store) if (now > v.expiresAt) this.store.delete(k)
  }
}

const quoteCache  = new TTLCache<StockQuote>()
const sectorCache = new TTLCache<SectorInfo>()
const newsCache   = new TTLCache<NewsItem[]>()

// Run GC every 60 seconds
setInterval(() => { quoteCache.gc(); sectorCache.gc() }, 60_000)

// ─── News ──────────────────────────────────────────────────────────────────────

export interface NewsItem {
  uuid: string
  title: string
  link: string
  publisher: string
  providerPublishTime: number
}

export async function fetchMarketNews(): Promise<NewsItem[]> {
  const CKEY = 'market_news'
  const cached = newsCache.get(CKEY)
  if (cached) return cached

  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=NIFTY&newsCount=8`
  const res  = await fetchWithProxy(url)
  const data = await res.json() as any
  const news = (data?.news ?? []) as NewsItem[]
  newsCache.set(CKEY, news, 5 * 60_000) // 5 min TTL
  return news
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

export interface StockQuote {
  symbol: string
  exchange: 'NSE' | 'BSE'
  ltp: number
  dayChange: number
  dayChangePct: number
  open: number
  high: number
  low: number
  volume: number
  marketCap?: number
  name?: string
}

/** Parse a Yahoo Finance v7/quote result item into StockQuote */
function parseYahooQuoteItem(item: any, symbol: string, exchange: 'NSE' | 'BSE'): StockQuote {
  const ltp       = item.regularMarketPrice      ?? item.regularMarketPreviousClose ?? 0
  const prevClose = item.regularMarketPreviousClose ?? ltp
  const dayChange = ltp - prevClose
  return {
    symbol, exchange, ltp, dayChange,
    dayChangePct: prevClose > 0 ? (dayChange / prevClose) * 100 : 0,
    open:        item.regularMarketOpen    ?? 0,
    high:        item.regularMarketDayHigh ?? 0,
    low:         item.regularMarketDayLow  ?? 0,
    volume:      item.regularMarketVolume  ?? 0,
    marketCap:   item.marketCap,
    name:        item.longName ?? item.shortName,
  }
}

/**
 * Fetch a single stock quote.
 * Returns a cached value (25 second TTL) when available to reduce API calls.
 */
export async function fetchQuote(symbol: string, exchange: 'NSE' | 'BSE'): Promise<StockQuote> {
  const cacheKey = `${symbol}::${exchange}`
  const cached = quoteCache.get(cacheKey)
  if (cached) return cached

  const ySym = toYahooSymbol(symbol, exchange)
  // Use v7/quote API (batch endpoint, faster than chart for single symbols)
  const url  = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ySym}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,marketCap,longName,shortName`
  const res  = await fetchWithProxy(url)
  const data = await res.json() as any

  const item = data?.quoteResponse?.result?.[0]
  if (!item) throw new Error(`No data for ${ySym}`)

  const quote = parseYahooQuoteItem(item, symbol, exchange)
  quoteCache.set(cacheKey, quote, 25_000) // 25s TTL
  return quote
}

/**
 * Batch fetch quotes using Yahoo Finance v7/quote endpoint.
 * Fetches up to 20 symbols per HTTP request — far more efficient than
 * one request per symbol. Falls back per-symbol on API failure.
 */
export async function fetchBatchQuotes(
  symbols: Array<{ symbol: string; exchange: 'NSE' | 'BSE' }>
): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>()
  if (symbols.length === 0) return results

  // Separate cached from uncached
  const toFetch: typeof symbols = []
  for (const s of symbols) {
    const cacheKey = `${s.symbol}::${s.exchange}`
    const cached   = quoteCache.get(cacheKey)
    if (cached) { results.set(cacheKey, cached); continue }
    toFetch.push(s)
  }
  if (toFetch.length === 0) return results

  // Chunk into groups of 20 (Yahoo limit per request)
  const BATCH_SIZE = 20
  const chunks: typeof symbols[] = []
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    chunks.push(toFetch.slice(i, i + BATCH_SIZE))
  }

  // Fire all chunks in parallel
  await Promise.allSettled(chunks.map(async (chunk) => {
    const ySymbols  = chunk.map(s => toYahooSymbol(s.symbol, s.exchange)).join(',')
    const url       = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ySymbols}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,marketCap,longName,shortName`
    try {
      const res  = await fetchWithProxy(url)
      const data = await res.json() as any
      const items: any[] = data?.quoteResponse?.result ?? []

      for (const item of items) {
        // Match response item back to original symbol/exchange
        const rawSym = item.symbol as string     // e.g. "RELIANCE.NS"
        const original = chunk.find(s => toYahooSymbol(s.symbol, s.exchange) === rawSym)
        if (!original) continue
        const key   = `${original.symbol}::${original.exchange}`
        const quote = parseYahooQuoteItem(item, original.symbol, original.exchange)
        quoteCache.set(key, quote, 25_000)
        results.set(key, quote)
      }
    } catch {
      // Per-symbol fallback for failed chunks
      await Promise.allSettled(
        chunk.map(async s => {
          try {
            const q   = await fetchQuote(s.symbol, s.exchange)
            results.set(`${s.symbol}::${s.exchange}`, q)
          } catch { /* skip */ }
        })
      )
    }
  }))

  return results
}

// ─── Sector Intelligence ──────────────────────────────────────────────────────

export interface SectorInfo {
  sector:   string
  industry: string
  longName: string
  source:   'yahoo' | 'static'
}

/**
 * Built-in NSE sector/industry map for ~200+ major Indian equities.
 * Used as instant fallback when Yahoo's quoteSummary is unavailable.
 * Lookup is O(1) – no network call needed.
 */
const NSE_MAP: Record<string, [string, string, string]> = {
  // [sector, industry, longName]
  // ── Banking ────────────────────────────────────────────────────────────────
  HDFCBANK:   ['Financial Services', 'Private Banks',         'HDFC Bank Ltd.'],
  ICICIBANK:  ['Financial Services', 'Private Banks',         'ICICI Bank Ltd.'],
  KOTAKBANK:  ['Financial Services', 'Private Banks',         'Kotak Mahindra Bank Ltd.'],
  AXISBANK:   ['Financial Services', 'Private Banks',         'Axis Bank Ltd.'],
  INDUSINDBK: ['Financial Services', 'Private Banks',         'IndusInd Bank Ltd.'],
  FEDERALBNK: ['Financial Services', 'Private Banks',         'The Federal Bank Ltd.'],
  IDFCFIRSTB: ['Financial Services', 'Private Banks',         'IDFC First Bank Ltd.'],
  YESBANK:    ['Financial Services', 'Private Banks',         'Yes Bank Ltd.'],
  RBLBANK:    ['Financial Services', 'Private Banks',         'RBL Bank Ltd.'],
  BANDHANBNK: ['Financial Services', 'Private Banks',         'Bandhan Bank Ltd.'],
  AUBANK:     ['Financial Services', 'Small Finance Banks',   'AU Small Finance Bank'],
  IDBI:       ['Financial Services', 'Public Sector Banks',   'IDBI Bank Ltd.'],
  SBIN:       ['Financial Services', 'Public Sector Banks',   'State Bank of India'],
  BANKBARODA: ['Financial Services', 'Public Sector Banks',   'Bank of Baroda'],
  PNB:        ['Financial Services', 'Public Sector Banks',   'Punjab National Bank'],
  CANARABANK: ['Financial Services', 'Public Sector Banks',   'Canara Bank'],
  UNIONBANK:  ['Financial Services', 'Public Sector Banks',   'Union Bank of India'],
  IOB:        ['Financial Services', 'Public Sector Banks',   'Indian Overseas Bank'],
  // ── NBFCs ─────────────────────────────────────────────────────────────────
  BAJFINANCE: ['Financial Services', 'Consumer Finance',      'Bajaj Finance Ltd.'],
  BAJAJFINSV: ['Financial Services', 'Financial Conglomerate','Bajaj Finserv Ltd.'],
  CHOLAFIN:   ['Financial Services', 'Vehicle Finance',       'Cholamandalam Investment'],
  MUTHOOTFIN: ['Financial Services', 'Gold Finance',          'Muthoot Finance Ltd.'],
  MANAPPURAM: ['Financial Services', 'Gold Finance',          'Manappuram Finance Ltd.'],
  SHRIRAMFIN: ['Financial Services', 'Vehicle Finance',       'Shriram Finance Ltd.'],
  LICHSGFIN:  ['Financial Services', 'Housing Finance',       'LIC Housing Finance Ltd.'],
  PNBHOUSING: ['Financial Services', 'Housing Finance',       'PNB Housing Finance Ltd.'],
  CANFINHOME: ['Financial Services', 'Housing Finance',       'Can Fin Homes Ltd.'],
  RECLTD:     ['Financial Services', 'Infrastructure Finance','REC Ltd.'],
  PFC:        ['Financial Services', 'Infrastructure Finance','Power Finance Corp. Ltd.'],
  IRFC:       ['Financial Services', 'Infrastructure Finance','Indian Railway Finance Corp.'],
  IRCTC:      ['Consumer Cyclical',  'Rail Travel & Tourism', 'Indian Railway Catering & Tourism'],
  // ── Insurance ─────────────────────────────────────────────────────────────
  LICI:       ['Financial Services', 'Life Insurance',        'Life Insurance Corporation'],
  SBILIFE:    ['Financial Services', 'Life Insurance',        'SBI Life Insurance Co. Ltd.'],
  HDFCLIFE:   ['Financial Services', 'Life Insurance',        'HDFC Life Insurance Co. Ltd.'],
  ICICIPRULI: ['Financial Services', 'Life Insurance',        'ICICI Prudential Life Insurance'],
  ICICIGI:    ['Financial Services', 'General Insurance',     'ICICI Lombard General Insurance'],
  GICRE:      ['Financial Services', 'Reinsurance',           'General Insurance Corporation'],
  NIACL:      ['Financial Services', 'General Insurance',     'New India Assurance Co. Ltd.'],
  // ── Asset Management ──────────────────────────────────────────────────────
  HDFCAMC:    ['Financial Services', 'Asset Management',      'HDFC AMC Ltd.'],
  NIPPONLIFE: ['Financial Services', 'Asset Management',      'Nippon Life India AMC'],
  UTIAMC:     ['Financial Services', 'Asset Management',      'UTI AMC Ltd.'],
  CAMS:       ['Financial Services', 'Financial Data',        'CAMS Ltd.'],
  CDSL:       ['Financial Services', 'Financial Data',        'CDSL Ltd.'],
  ANGELONE:   ['Financial Services', 'Stockbroking',          'Angel One Ltd.'],
  MOTILALOFS: ['Financial Services', 'Stockbroking',          'Motilal Oswal Financial'],
  SBICARD:    ['Financial Services', 'Credit Cards',          'SBI Cards and Payment Services'],
  MCX:        ['Financial Services', 'Commodity Exchange',    'Multi Commodity Exchange'],
  BSE:        ['Financial Services', 'Stock Exchange',        'BSE Ltd.'],
  PAYTM:      ['Financial Services', 'Fintech/Payments',      'One 97 Communications (Paytm)'],
  POLICYBZR:  ['Financial Services', 'InsurTech',             'PB Fintech Ltd.'],
  // ── Information Technology ────────────────────────────────────────────────
  TCS:        ['Information Technology', 'IT Services',       'Tata Consultancy Services'],
  INFY:       ['Information Technology', 'IT Services',       'Infosys Ltd.'],
  WIPRO:      ['Information Technology', 'IT Services',       'Wipro Ltd.'],
  HCLTECH:    ['Information Technology', 'IT Services',       'HCL Technologies Ltd.'],
  TECHM:      ['Information Technology', 'IT Services',       'Tech Mahindra Ltd.'],
  LTIM:       ['Information Technology', 'IT Services',       'LTIMindtree Ltd.'],
  MPHASIS:    ['Information Technology', 'IT Services',       'Mphasis Ltd.'],
  COFORGE:    ['Information Technology', 'IT Services',       'Coforge Ltd.'],
  PERSISTENT: ['Information Technology', 'IT Services',       'Persistent Systems Ltd.'],
  OFSS:       ['Information Technology', 'Financial Software','Oracle Financial Services'],
  KPITTECH:   ['Information Technology', 'IT Services',       'KPIT Technologies Ltd.'],
  CYIENT:     ['Information Technology', 'IT Services',       'Cyient Ltd.'],
  TATAELXSI:  ['Information Technology', 'IT Services',       'Tata Elxsi Ltd.'],
  MINDTREE:   ['Information Technology', 'IT Services',       'MindTree Ltd.'],
  NAUKRI:     ['Information Technology', 'Online Recruitment','Info Edge (India) Ltd.'],
  INDIAMART:  ['Information Technology', 'B2B e-Commerce',    'IndiaMART InterMESH Ltd.'],
  ZENSARTECH: ['Information Technology', 'IT Services',       'Zensar Technologies Ltd.'],
  // ── Energy ────────────────────────────────────────────────────────────────
  RELIANCE:   ['Energy',    'Integrated Oil & Gas', 'Reliance Industries Ltd.'],
  ONGC:       ['Energy',    'Oil Exploration',      'Oil and Natural Gas Corporation'],
  IOC:        ['Energy',    'Oil Refining',         'Indian Oil Corporation Ltd.'],
  BPCL:       ['Energy',    'Oil Refining',         'Bharat Petroleum Corp. Ltd.'],
  HINDPETRO:  ['Energy',    'Oil Refining',         'Hindustan Petroleum Corp. Ltd.'],
  PETRONET:   ['Energy',    'LNG',                  'Petronet LNG Ltd.'],
  MRPL:       ['Energy',    'Oil Refining',         'Mangalore Refinery & Petrochemicals'],
  CASTROLIND: ['Energy',    'Lubricants',            'Castrol India Ltd.'],
  // ── Utilities ─────────────────────────────────────────────────────────────
  NTPC:       ['Utilities', 'Power Generation',    'NTPC Ltd.'],
  POWERGRID:  ['Utilities', 'Power Transmission',  'Power Grid Corporation'],
  ADANIGREEN: ['Utilities', 'Renewable Energy',    'Adani Green Energy Ltd.'],
  TATAPOWER:  ['Utilities', 'Integrated Power',    'Tata Power Co. Ltd.'],
  CESC:       ['Utilities', 'Power Distribution',  'CESC Ltd.'],
  JSWENERGY:  ['Utilities', 'Power Generation',    'JSW Energy Ltd.'],
  ADANIPOWER: ['Utilities', 'Power Generation',    'Adani Power Ltd.'],
  TORNTPOWER: ['Utilities', 'Power Distribution',  'Torrent Power Ltd.'],
  NHPC:       ['Utilities', 'Hydro Power',         'NHPC Ltd.'],
  NLCINDIA:   ['Utilities', 'Power Generation',    'NLC India Ltd.'],
  SUZLON:     ['Utilities', 'Wind Energy',         'Suzlon Energy Ltd.'],
  GAIL:       ['Utilities', 'Natural Gas',         'GAIL (India) Ltd.'],
  GUJGASLTD:  ['Utilities', 'Gas Distribution',   'Gujarat Gas Ltd.'],
  IGL:        ['Utilities', 'Gas Distribution',   'Indraprastha Gas Ltd.'],
  MGL:        ['Utilities', 'Gas Distribution',   'Mahanagar Gas Ltd.'],
  GSPL:       ['Utilities', 'Gas Transmission',   'Gujarat State Petronet Ltd.'],
  ADANIGAS:   ['Utilities', 'Gas Distribution',   'Adani Total Gas Ltd.'],
  // ── Basic Materials ───────────────────────────────────────────────────────
  TATASTEEL:  ['Basic Materials', 'Steel',              'Tata Steel Ltd.'],
  JSWSTEEL:   ['Basic Materials', 'Steel',              'JSW Steel Ltd.'],
  SAIL:       ['Basic Materials', 'Steel',              'Steel Authority of India'],
  HINDALCO:   ['Basic Materials', 'Aluminium',          'Hindalco Industries Ltd.'],
  VEDL:       ['Basic Materials', 'Diversified Metals', 'Vedanta Ltd.'],
  NATIONALUM: ['Basic Materials', 'Aluminium',          'National Aluminium Co. Ltd.'],
  COALINDIA:  ['Basic Materials', 'Coal Mining',        'Coal India Ltd.'],
  NMDC:       ['Basic Materials', 'Iron Ore Mining',    'NMDC Ltd.'],
  ULTRACEMCO: ['Basic Materials', 'Cement',             'UltraTech Cement Ltd.'],
  AMBUJACEM:  ['Basic Materials', 'Cement',             'Ambuja Cements Ltd.'],
  SHREECEM:   ['Basic Materials', 'Cement',             'Shree Cement Ltd.'],
  ACC:        ['Basic Materials', 'Cement',             'ACC Ltd.'],
  DALMIACEME: ['Basic Materials', 'Cement',             'Dalmia Bharat Ltd.'],
  RAMCOCEM:   ['Basic Materials', 'Cement',             'The Ramco Cements Ltd.'],
  PIDILITIND: ['Basic Materials', 'Specialty Chemicals','Pidilite Industries Ltd.'],
  SRF:        ['Basic Materials', 'Specialty Chemicals','SRF Ltd.'],
  DEEPAKNTR:  ['Basic Materials', 'Specialty Chemicals','Deepak Nitrite Ltd.'],
  AARTIIND:   ['Basic Materials', 'Specialty Chemicals','Aarti Industries Ltd.'],
  UPL:        ['Basic Materials', 'Agrochemicals',      'UPL Ltd.'],
  PIIND:      ['Basic Materials', 'Agrochemicals',      'PI Industries Ltd.'],
  COROMANDEL: ['Basic Materials', 'Fertilisers',        'Coromandel International'],
  TATACHEM:   ['Basic Materials', 'Chemicals',          'Tata Chemicals Ltd.'],
  GRAPHITE:   ['Basic Materials', 'Industrial Graphite','Graphene Industry'],
  HEG:        ['Basic Materials', 'Industrial Graphite','HEG Ltd.'],
  RAIN:       ['Basic Materials', 'Specialty Chemicals','Rain Industries Ltd.'],
  MMTC:       ['Basic Materials', 'Metals Trading',    'MMTC Ltd.'],
  FINOLEXIND: ['Basic Materials', 'PVC Pipes',          'Finolex Industries Ltd.'],
  CENTURYTEX: ['Basic Materials', 'Textiles',           'Century Textiles and Industries'],
  // ── Automobiles ───────────────────────────────────────────────────────────
  MARUTI:     ['Consumer Cyclical', 'Automobiles',       'Maruti Suzuki India Ltd.'],
  TATAMOTORS: ['Consumer Cyclical', 'Automobiles',       'Tata Motors Ltd.'],
  BAJAJ_AUTO: ['Consumer Cyclical', '2-Wheelers',        'Bajaj Auto Ltd.'],
  HEROMOTOCO: ['Consumer Cyclical', '2-Wheelers',        'Hero MotoCorp Ltd.'],
  EICHERMOT:  ['Consumer Cyclical', '2-Wheelers',        'Eicher Motors Ltd.'],
  TVSMOTOR:   ['Consumer Cyclical', '2-Wheelers',        'TVS Motor Company Ltd.'],
  ASHOKLEY:   ['Consumer Cyclical', 'Commercial Vehicles','Ashok Leyland Ltd.'],
  MOTHERSON:  ['Consumer Cyclical', 'Auto Components',   'Samvardhana Motherson Intl'],
  BOSCHLTD:   ['Consumer Cyclical', 'Auto Components',   'Bosch Ltd.'],
  BHARATFORG: ['Consumer Cyclical', 'Auto Components',   'Bharat Forge Ltd.'],
  APOLLOTYRE: ['Consumer Cyclical', 'Tyres',             'Apollo Tyres Ltd.'],
  MRF:        ['Consumer Cyclical', 'Tyres',             'MRF Ltd.'],
  CEATLTD:    ['Consumer Cyclical', 'Tyres',             'CEAT Ltd.'],
  BALKRISIND: ['Consumer Cyclical', 'Tyres',             'Balkrishna Industries Ltd.'],
  EXIDEIND:   ['Consumer Cyclical', 'Auto Batteries',    'Exide Industries Ltd.'],
  ESCORTS:    ['Consumer Cyclical', 'Tractors',          'Escorts Kubota Ltd.'],
  MAHINDCIE:  ['Consumer Cyclical', 'Auto Components',   'Mahindra CIE Automotive'],
  // ── Consumer Defensive ────────────────────────────────────────────────────
  HINDUNILVR: ['Consumer Defensive', 'FMCG',             'Hindustan Unilever Ltd.'],
  ITC:        ['Consumer Defensive', 'Tobacco & FMCG',   'ITC Ltd.'],
  NESTLEIND:  ['Consumer Defensive', 'Packaged Foods',   'Nestle India Ltd.'],
  BRITANNIA:  ['Consumer Defensive', 'Packaged Foods',   'Britannia Industries Ltd.'],
  DABUR:      ['Consumer Defensive', 'Personal Products','Dabur India Ltd.'],
  MARICO:     ['Consumer Defensive', 'Personal Products','Marico Ltd.'],
  COLPAL:     ['Consumer Defensive', 'Personal Products','Colgate-Palmolive (India)'],
  GODREJCP:   ['Consumer Defensive', 'Household Products','Godrej Consumer Products'],
  EMAMILTD:   ['Consumer Defensive', 'Personal Products','Emami Ltd.'],
  TATACONSUM: ['Consumer Defensive', 'Beverages',        'Tata Consumer Products Ltd.'],
  DMART:      ['Consumer Defensive', 'Discount Retail',  'Avenue Supermarts Ltd.'],
  VBL:        ['Consumer Defensive', 'Beverages',        'Varun Beverages Ltd.'],
  UBL:        ['Consumer Defensive', 'Beverages',        'United Breweries Ltd.'],
  GODFRYPHLP: ['Consumer Defensive', 'Tobacco',          'Godfrey Phillips India Ltd.'],
  KRBL:       ['Consumer Defensive', 'Packaged Foods',   'KRBL Ltd.'],
  HATSUN:     ['Consumer Defensive', 'Dairy Products',   'Hatsun Agro Product Ltd.'],
  // ── Consumer Cyclical ─────────────────────────────────────────────────────
  TITAN:      ['Consumer Cyclical', 'Luxury Goods',      'Titan Company Ltd.'],
  TRENT:      ['Consumer Cyclical', 'Specialty Retail',  'Trent Ltd.'],
  PAGEIND:    ['Consumer Cyclical', 'Apparel',           'Page Industries Ltd.'],
  MANYAVAR:   ['Consumer Cyclical', 'Apparel',           'Vedant Fashions Ltd.'],
  NYKAA:      ['Consumer Cyclical', 'E-Commerce Beauty', 'FSN E-Commerce Ventures'],
  ZOMATO:     ['Consumer Cyclical', 'Online Food',       'Eternal Ltd. (Zomato)'],
  TRIDENT:    ['Consumer Cyclical', 'Textiles',          'Trident Ltd.'],
  RAYMOND:    ['Consumer Cyclical', 'Apparel',           'Raymond Ltd.'],
  RELAXO:     ['Consumer Cyclical', 'Footwear',          'Relaxo Footwears Ltd.'],
  BATAINDIA:  ['Consumer Cyclical', 'Footwear',          'Bata India Ltd.'],
  DIXON:      ['Consumer Cyclical', 'Consumer Electronics','Dixon Technologies'],
  VOLTAS:     ['Consumer Cyclical', 'Consumer Durables', 'Voltas Ltd.'],
  WHIRLPOOL:  ['Consumer Cyclical', 'Consumer Durables', 'Whirlpool of India Ltd.'],
  SYMPHONY:   ['Consumer Cyclical', 'Consumer Durables', 'Symphony Ltd.'],
  ORIENTELEC: ['Consumer Cyclical', 'Consumer Durables', 'Orient Electric Ltd.'],
  JUBILANT:   ['Consumer Cyclical', 'QSR (Food Service)','Jubilant FoodWorks Ltd.'],
  PVR:        ['Consumer Cyclical', 'Movie Entertainment','PVR INOX Ltd.'],
  PCJEWELLER: ['Consumer Cyclical', 'Jewellery Retail',  'PC Jeweller Ltd.'],
  RAJESHEXPO: ['Consumer Cyclical', 'Gold Processing',   'Rajesh Exports Ltd.'],
  LUXIND:     ['Consumer Cyclical', 'Apparel',           'Lux Industries Ltd.'],
  KPRMILL:    ['Consumer Cyclical', 'Textiles',          'KPR Mill Ltd.'],
  WELSPUNIND: ['Consumer Cyclical', 'Home Textiles',     'Welspun India Ltd.'],
  // ── Healthcare ────────────────────────────────────────────────────────────
  SUNPHARMA:  ['Healthcare', 'Pharmaceuticals',    'Sun Pharmaceutical Industries'],
  DRREDDY:    ['Healthcare', 'Pharmaceuticals',    "Dr. Reddy's Laboratories"],
  CIPLA:      ['Healthcare', 'Pharmaceuticals',    'Cipla Ltd.'],
  DIVISLAB:   ['Healthcare', 'Pharmaceuticals (API)',"Divi's Laboratories Ltd."],
  LUPIN:      ['Healthcare', 'Pharmaceuticals',    'Lupin Ltd.'],
  BIOCON:     ['Healthcare', 'Biotechnology',      'Biocon Ltd.'],
  AUROPHARMA: ['Healthcare', 'Pharmaceuticals',    'Aurobindo Pharma Ltd.'],
  ALKEM:      ['Healthcare', 'Pharmaceuticals',    'Alkem Laboratories Ltd.'],
  GLENMARK:   ['Healthcare', 'Pharmaceuticals',    'Glenmark Pharmaceuticals Ltd.'],
  APOLLOHOSP: ['Healthcare', 'Hospitals',          'Apollo Hospitals Enterprise Ltd.'],
  MAXHEALTH:  ['Healthcare', 'Hospitals',          'Max Healthcare Institute Ltd.'],
  FORTIS:     ['Healthcare', 'Hospitals',          'Fortis Healthcare Ltd.'],
  LALPATHLAB: ['Healthcare', 'Diagnostics',        'Dr. Lal PathLabs Ltd.'],
  ABBOTINDIA: ['Healthcare', 'Pharmaceuticals',    'Abbott India Ltd.'],
  SANOFI:     ['Healthcare', 'Pharmaceuticals',    'Sanofi India Ltd.'],
  PFIZER:     ['Healthcare', 'Pharmaceuticals',    'Pfizer Ltd.'],
  IPCALAB:    ['Healthcare', 'Pharmaceuticals',    'Ipca Laboratories Ltd.'],
  LAURUSLABS: ['Healthcare', 'Pharmaceuticals (API)','Laurus Labs Ltd.'],
  SEQUENT:    ['Healthcare', 'Veterinary Pharma',  'Sequent Scientific Ltd.'],
  ERIS:       ['Healthcare', 'Pharmaceuticals',    'Eris Lifesciences Ltd.'],
  NATCOPHARM: ['Healthcare', 'Pharmaceuticals',    'Natco Pharma Ltd.'],
  ZYDUSLIFE:  ['Healthcare', 'Pharmaceuticals',    'Zydus Lifesciences Ltd.'],
  // ── Communication Services ────────────────────────────────────────────────
  BHARTIARTL: ['Communication', 'Telecom',          'Bharti Airtel Ltd.'],
  IDEA:       ['Communication', 'Telecom',          'Vodafone Idea Ltd.'],
  TATACOMM:   ['Communication', 'Telecom',          'Tata Communications Ltd.'],
  SUNTV:      ['Communication', 'Broadcasting',     'Sun TV Network Ltd.'],
  ZEEL:       ['Communication', 'Broadcasting',     'Zee Entertainment Enterprises'],
  NETWORK18:  ['Communication', 'Media Conglomerate','Network18 Media & Investments'],
  TV18BRDCST: ['Communication', 'Broadcasting',     'TV18 Broadcast Ltd.'],
  HFCL:       ['Communication', 'Telecom Equipment','HFCL Ltd.'],
  JUSTDIAL:   ['Communication', 'Online Services',  'Just Dial Ltd.'],
  // ── Industrials & Capital Goods ───────────────────────────────────────────
  LT:         ['Industrials', 'Engineering & Construction','Larsen & Toubro Ltd.'],
  SIEMENS:    ['Industrials', 'Industrial Conglomerate','Siemens India Ltd.'],
  ABB:        ['Industrials', 'Electrical Equipment', 'ABB India Ltd.'],
  HAVELLS:    ['Industrials', 'Electrical Equipment', 'Havells India Ltd.'],
  CUMMINSIND: ['Industrials', 'Industrial Machinery', 'Cummins India Ltd.'],
  BHEL:       ['Industrials', 'Heavy Electrical',     'Bharat Heavy Electricals Ltd.'],
  THERMAX:    ['Industrials', 'Industrial Machinery', 'Thermax Ltd.'],
  POLYCAB:    ['Industrials', 'Cables & Wires',       'Polycab India Ltd.'],
  KEI:        ['Industrials', 'Cables & Wires',       'KEI Industries Ltd.'],
  FINCABLES:  ['Industrials', 'Cables & Wires',       'Finolex Cables Ltd.'],
  BEL:        ['Industrials', 'Defence Electronics',  'Bharat Electronics Ltd.'],
  HAL:        ['Industrials', 'Aerospace & Defence',  'Hindustan Aeronautics Ltd.'],
  ADANIPORTS: ['Industrials', 'Ports & Logistics',    'Adani Ports and SEZ Ltd.'],
  ADANIENT:   ['Industrials', 'Conglomerate',         'Adani Enterprises Ltd.'],
  BLUEDART:   ['Industrials', 'Logistics',            'Blue Dart Express Ltd.'],
  DELHIVERY:  ['Industrials', 'Logistics',            'Delhivery Ltd.'],
  CONCOR:     ['Industrials', 'Rail Freight',         'Container Corporation of India'],
  INDIGO:     ['Industrials', 'Aviation',             'InterGlobe Aviation Ltd.'],
  GMRINFRA:   ['Industrials', 'Airports',             'GMR Infrastructure Ltd.'],
  IRB:        ['Industrials', 'Roads & Highways',     'IRB Infrastructure Developers'],
  NCC:        ['Industrials', 'Construction',         'NCC Ltd.'],
  PNCINFRA:   ['Industrials', 'Roads & Highways',     'PNC Infratech Ltd.'],
  NBCC:       ['Industrials', 'Construction (Govt)',  'NBCC (India) Ltd.'],
  KEC:        ['Industrials', 'Power T&D EPC',        'KEC International Ltd.'],
  KALPATPOWR: ['Industrials', 'Power T&D EPC',        'Kalpataru Power Transmission'],
  RITES:      ['Industrials', 'Rail Consultancy',     'RITES Ltd.'],
  AIAENG:     ['Industrials', 'Mining Equipment',     'AIA Engineering Ltd.'],
  GRINDWELL:  ['Industrials', 'Abrasives',            'Grindwell Norton Ltd.'],
  HONAUT:     ['Industrials', 'Industrial Solutions', 'Honeywell Automation India'],
  SCHAEFFLER: ['Industrials', 'Bearings',             'Schaeffler India Ltd.'],
  // ── Real Estate ───────────────────────────────────────────────────────────
  DLF:        ['Real Estate', 'Real Estate Development','DLF Ltd.'],
  GODREJPROP: ['Real Estate', 'Real Estate Development','Godrej Properties Ltd.'],
  OBEROIRLTY: ['Real Estate', 'Real Estate Development','Oberoi Realty Ltd.'],
  PRESTIGE:   ['Real Estate', 'Real Estate Development','Prestige Estates Projects'],
  PHOENIXLTD: ['Real Estate', 'Retail REITs',          'Phoenix Mills Ltd.'],
  SOBHA:      ['Real Estate', 'Real Estate Development','Sobha Ltd.'],
  // ── Indices / Commodities ─────────────────────────────────────────────────
  NIFTY:      ['Index',       'Broad Market',   'NIFTY 50 Index'],
  BANKNIFTY:  ['Index',       'Banking Index',  'NIFTY Bank Index'],
  SENSEX:     ['Index',       'Broad Market',   'BSE SENSEX'],
  GOLD:       ['Commodities', 'Precious Metals','Gold'],
  SILVER:     ['Commodities', 'Precious Metals','Silver'],
  CRUDEOIL:   ['Commodities', 'Energy',         'Crude Oil'],
}

/**
 * Fetch sector, industry, and full name for a stock.
 * Order: (1) in-memory cache → (2) static NSE_MAP (instant, O(1)) →
 * (3) Yahoo Finance quoteSummary (network, async).
 * Static results are cached for 24 hours; Yahoo results permanently
 * until next page reload.
 */
export async function fetchSectorInfo(
  symbol: string,
  exchange: 'NSE' | 'BSE'
): Promise<SectorInfo> {
  const cacheKey = `sector::${symbol}::${exchange}`
  const cached   = sectorCache.get(cacheKey)
  if (cached) return cached

  // 1. Static map first – instant, no network round-trip
  const normalised = symbol.toUpperCase().replace(/[-.\s]/g, '_')
  const candidate  = NSE_MAP[symbol.toUpperCase()] ?? NSE_MAP[normalised]
  if (candidate) {
    const [sector, industry, longName] = candidate
    const result: SectorInfo = { sector, industry, longName, source: 'static' }
    sectorCache.set(cacheKey, result, 24 * 60 * 60_000) // 24h
    return result
  }

  // 2. Yahoo Finance assetProfile (only when static map has no entry)
  try {
    const ySym = toYahooSymbol(symbol, exchange)
    const url  = `https://query2.finance.yahoo.com/v11/finance/quoteSummary/${ySym}?modules=assetProfile,quoteType`
    const res  = await fetchWithProxy(url)
    const data = await res.json() as any
    const profile   = data?.quoteSummary?.result?.[0]?.assetProfile
    const quoteType = data?.quoteSummary?.result?.[0]?.quoteType
    const sector    = profile?.sector as string | undefined
    if (sector && sector.length > 1) {
      const result: SectorInfo = {
        sector,
        industry: profile.industry ?? sector,
        longName: quoteType?.longName ?? quoteType?.shortName ?? symbol,
        source: 'yahoo',
      }
      sectorCache.set(cacheKey, result, 24 * 60 * 60_000)
      return result
    }
  } catch { /* fallthrough */ }

  // 3. Default uncategorised
  const fallback: SectorInfo = { sector: 'Uncategorised', industry: 'Unknown', longName: symbol, source: 'static' }
  sectorCache.set(cacheKey, fallback, 60 * 60_000) // retry in 1h
  return fallback
}

/**
 * Batch fetch sector info.
 * - Static map hits are resolved synchronously (0ms network time)
 * - Only unknown symbols go to Yahoo Finance
 * - Yahoo calls are fired in parallel (no sequential chunking)
 * - 300ms inter-chunk delay removed; rate-limit headroom via concurrency cap
 */
export async function fetchBatchSectorInfo(
  symbols: Array<{ symbol: string; exchange: 'NSE' | 'BSE' }>
): Promise<Map<string, SectorInfo>> {
  const results = new Map<string, SectorInfo>()
  if (symbols.length === 0) return results

  // Separate static (instant) from needs-network
  const needsNetwork: typeof symbols = []
  for (const s of symbols) {
    const key       = `${s.symbol}::${s.exchange}`
    const cacheKey  = `sector::${s.symbol}::${s.exchange}`
    const cached    = sectorCache.get(cacheKey)
    if (cached) { results.set(key, cached); continue }

    const normalised = s.symbol.toUpperCase().replace(/[-.\s]/g, '_')
    const candidate  = NSE_MAP[s.symbol.toUpperCase()] ?? NSE_MAP[normalised]
    if (candidate) {
      const [sector, industry, longName] = candidate
      const info: SectorInfo = { sector, industry, longName, source: 'static' }
      sectorCache.set(cacheKey, info, 24 * 60 * 60_000)
      results.set(key, info)
      continue
    }
    needsNetwork.push(s)
  }

  if (needsNetwork.length === 0) return results

  // Fire network calls with concurrency cap of 5 to avoid rate limiting
  const CONCURRENCY = 5
  for (let i = 0; i < needsNetwork.length; i += CONCURRENCY) {
    const batch = needsNetwork.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      batch.map(s => fetchSectorInfo(s.symbol, s.exchange))
    )
    settled.forEach((r, idx) => {
      const key = `${batch[idx].symbol}::${batch[idx].exchange}`
      results.set(
        key,
        r.status === 'fulfilled'
          ? r.value
          : { sector: 'Uncategorised', industry: 'Unknown', longName: batch[idx].symbol, source: 'static' }
      )
    })
    // Minimal delay only between network batches
    if (i + CONCURRENCY < needsNetwork.length) {
      await new Promise(r => setTimeout(r, 150))
    }
  }

  return results
}

/** Expose cache control for testing / manual invalidation */
export const marketDataCache = {
  clearQuotes:  () => quoteCache.clear(),
  clearSectors: () => sectorCache.clear(),
  clearNews:    () => newsCache.clear(),
  clearAll:     () => { quoteCache.clear(); sectorCache.clear(); newsCache.clear() },
}
