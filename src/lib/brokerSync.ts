// ─── Broker Sync Logic ────────────────────────────────────────────────────────
// Browser ↔ Broker APIs are CORS-restricted; we use a proxy where possible.

const CORS_PROXY = (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`

// ─── ZERODHA ──────────────────────────────────────────────────────────────────

export function zerodhaAuthUrl(apiKey: string): string {
  return `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`
}

async function sha256hex(msg: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function zerodhaExchangeToken(
  apiKey: string, apiSecret: string, requestToken: string
): Promise<string> {
  const checksum = await sha256hex(apiKey + requestToken + apiSecret)
  const res = await fetch(CORS_PROXY('https://api.kite.trade/session/token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Kite-Version': '3' },
    body: new URLSearchParams({ api_key: apiKey, request_token: requestToken, checksum }),
  })
  if (!res.ok) throw new Error(`Zerodha token exchange failed: ${res.status}`)
  const data = await res.json() as any
  if (!data.data?.access_token) throw new Error(data.message ?? 'No access_token in response')
  return data.data.access_token as string
}

export async function zerodhaFetch(apiKey: string, accessToken: string) {
  const headers: HeadersInit = {
    'Authorization': `token ${apiKey}:${accessToken}`,
    'X-Kite-Version': '3',
  }
  const [ordersRes, posRes, holdingsRes] = await Promise.allSettled([
    fetch(CORS_PROXY('https://api.kite.trade/orders'), { headers }),
    fetch(CORS_PROXY('https://api.kite.trade/portfolio/positions'), { headers }),
    fetch(CORS_PROXY('https://api.kite.trade/portfolio/holdings'), { headers }),
  ])
  const parse = async (r: PromiseSettledResult<Response>) =>
    r.status === 'fulfilled' ? ((await r.value.json()) as any)?.data ?? [] : []

  return {
    orders:    await parse(ordersRes),
    positions: await parse(posRes),
    holdings:  await parse(holdingsRes),
  }
}

// ─── UPSTOX ──────────────────────────────────────────────────────────────────

const UPSTOX_BASE = 'https://api.upstox.com/v2'

export function upstoxAuthUrl(apiKey: string, redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: apiKey,
    redirect_uri: redirectUri,
  })
  return `${UPSTOX_BASE}/login/authorization/dialog?${params}`
}

export async function upstoxExchangeToken(
  apiKey: string,
  apiSecret: string,
  code: string,
  redirectUri: string
): Promise<string> {
  const res = await fetch(CORS_PROXY(`${UPSTOX_BASE}/login/authorization/token`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      code,
      client_id: apiKey,
      client_secret: apiSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Upstox token exchange failed (${res.status}): ${body.slice(0, 200)}`)
  }
  const data = await res.json() as any
  if (!data.access_token) throw new Error(data.message ?? data.error ?? 'No access_token in Upstox response')
  return data.access_token as string
}

export async function upstoxFetch(accessToken: string) {
  const headers: HeadersInit = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  }

  const [ordersRes, posRes, holdingsRes, tradeRes] = await Promise.allSettled([
    fetch(CORS_PROXY(`${UPSTOX_BASE}/order/retrieve-all`), { headers }),
    fetch(CORS_PROXY(`${UPSTOX_BASE}/portfolio/short-term-positions`), { headers }),
    fetch(CORS_PROXY(`${UPSTOX_BASE}/portfolio/long-term-holdings`), { headers }),
    fetch(CORS_PROXY(`${UPSTOX_BASE}/order/trades/get-trades-for-day`), { headers }),
  ])

  const parse = async (r: PromiseSettledResult<Response>) => {
    if (r.status !== 'fulfilled') return []
    const json = await r.value.json() as any
    return json?.data ?? []
  }

  return {
    orders:    await parse(ordersRes),
    positions: await parse(posRes),
    holdings:  await parse(holdingsRes),
    trades:    await parse(tradeRes),
  }
}

// ─── Map Upstox → internal types ─────────────────────────────────────────────

export function mapUpstoxOrder(o: any, accountId: string) {
  // Upstox order status: 'complete', 'cancelled', 'rejected', 'open'
  const type = o.transaction_type === 'SELL' ? 'SELL' : 'BUY'
  const exchange = (o.exchange ?? 'NSE').includes('BSE') ? 'BSE' : 'NSE'

  return {
    account_id:       accountId,
    symbol:           o.tradingsymbol ?? o.trading_symbol ?? '',
    exchange:         exchange as 'NSE' | 'BSE',
    type:             type as 'BUY' | 'SELL',
    quantity:         Math.abs(o.filled_quantity ?? o.quantity ?? 0),
    price:            o.average_price ?? o.price ?? 0,
    brokerage:        0,
    stt:              0,
    exchange_charges: 0,
    gst:              0,
    transaction_date: (o.order_timestamp ?? o.exchange_timestamp ?? '')
      .split('T')[0].split(' ')[0] || new Date().toISOString().split('T')[0],
  }
}

export function mapUpstoxTrade(t: any, accountId: string) {
  const type = t.transaction_type === 'SELL' ? 'SELL' : 'BUY'
  const exchange = (t.exchange ?? 'NSE').includes('BSE') ? 'BSE' : 'NSE'
  return {
    account_id:       accountId,
    symbol:           t.tradingsymbol ?? t.trading_symbol ?? '',
    exchange:         exchange as 'NSE' | 'BSE',
    type:             type as 'BUY' | 'SELL',
    quantity:         Math.abs(t.quantity ?? 0),
    price:            t.average_price ?? t.price ?? 0,
    brokerage:        0,
    stt:              0,
    exchange_charges: 0,
    gst:              0,
    transaction_date: (t.order_execution_time ?? t.exchange_timestamp ?? '')
      .split('T')[0].split(' ')[0] || new Date().toISOString().split('T')[0],
  }
}

export function mapUpstoxHolding(h: any) {
  const exchange = (h.exchange ?? 'NSE').includes('BSE') ? 'BSE' : 'NSE'
  return {
    symbol:    h.tradingsymbol ?? h.trading_symbol ?? '',
    exchange:  exchange as 'NSE' | 'BSE',
    qty:       h.quantity ?? 0,
    avgPrice:  h.average_price ?? 0,
    lastPrice: h.last_price ?? h.close_price ?? h.average_price ?? 0,
    pnl:       h.pnl ?? 0,
  }
}
