const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string
const BASE_URL = 'https://finnhub.io/api/v1'

const cache = new Map<string, { data: unknown; ts: number }>()
const TTL = 60_000 // 1 minute

async function cached<T>(url: string): Promise<T> {
  const hit = cache.get(url)
  if (hit && Date.now() - hit.ts < TTL) return hit.data as T
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${res.statusText}`)
  const data = await res.json()
  cache.set(url, { data, ts: Date.now() })
  return data as T
}

export interface Quote {
  c: number   // current price
  d: number   // change
  dp: number  // % change
  h: number   // high
  l: number   // low
  o: number   // open
  pc: number  // prev close
}

export interface Candles {
  c: number[]
  h: number[]
  l: number[]
  o: number[]
  t: number[]
  v: number[]
  s: 'ok' | 'no_data'
}

export function getQuote(symbol: string) {
  return cached<Quote>(`${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`)
}

// Seeded LCG so the chart shape is stable across re-renders for the same symbol
function seededRng(seed: number) {
  let s = seed | 0
  return () => {
    s = Math.imul(s, 1664525) + 1013904223
    return (s >>> 0) / 0xffffffff
  }
}

export function generateMockCandles(symbol: string, currentPrice: number): Candles {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rng = seededRng(seed)
  const DAYS = 30
  const VOL = 0.013 // ~1.3% daily volatility

  // Random walk backwards from current price so the last point is always real
  const close: number[] = new Array(DAYS)
  close[DAYS - 1] = currentPrice
  for (let i = DAYS - 2; i >= 0; i--) {
    const ret = (rng() - 0.48) * 2 * VOL  // slight upward bias
    close[i] = close[i + 1] / (1 + ret)
  }

  const now = Math.floor(Date.now() / 1000)
  const DAY = 86400

  return {
    s: 'ok',
    c: close,
    o: close.map((p, i) => (i === 0 ? p : close[i - 1])),
    h: close.map(p => p * (1 + rng() * VOL * 0.6)),
    l: close.map(p => p * (1 - rng() * VOL * 0.6)),
    v: Array.from({ length: DAYS }, () => Math.floor(rng() * 9_000_000 + 1_000_000)),
    t: Array.from({ length: DAYS }, (_, i) => now - (DAYS - 1 - i) * DAY),
  }
}
