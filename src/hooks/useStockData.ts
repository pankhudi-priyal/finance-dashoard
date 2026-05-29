import { useState, useEffect } from 'react'
import { getQuote, generateMockCandles } from '../lib/finnhub'
import type { Quote, Candles } from '../lib/finnhub'

export interface StockData {
  quote: Quote | null
  candles: Candles | null
  loading: boolean
  error: string | null
}

export function useStockData(symbol: string): StockData {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [candles, setCandles] = useState<Candles | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    setError(null)
    getQuote(symbol)
      .then(q => {
        setQuote(q)
        setCandles(generateMockCandles(symbol, q.c))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [symbol])

  return { quote, candles, loading, error }
}
