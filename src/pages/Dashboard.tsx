import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { getQuote } from '../lib/finnhub'
import type { Quote } from '../lib/finnhub'
import { useAuth } from '../hooks/useAuth'
import { useStockData } from '../hooks/useStockData'
import { Navbar } from '../components/Navbar'
import { StockCard } from '../components/StockCard'
import { Skeleton } from '../components/Skeleton'

export default function Dashboard() {
  const { session } = useAuth()
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [watchlistLoading, setWatchlistLoading] = useState(true)
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [newSymbol, setNewSymbol] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    supabase
      .from('watchlist')
      .select('symbol')
      .order('created_at')
      .then(({ data, error }) => {
        if (!error && data) {
          const symbols = data.map((d: { symbol: string }) => d.symbol)
          setWatchlist(symbols)
          if (symbols.length > 0) setSelectedSymbol(symbols[0])
        }
        setWatchlistLoading(false)
      })
  }, [session])

  useEffect(() => {
    if (watchlist.length === 0) return
    setQuotesLoading(true)
    Promise.all(watchlist.map(s => getQuote(s).then(q => [s, q] as [string, Quote])))
      .then(entries => setQuotes(Object.fromEntries(entries)))
      .finally(() => setQuotesLoading(false))
  }, [watchlist])

  const { candles, loading: chartLoading } = useStockData(selectedSymbol)

  const chartData = useMemo(() => {
    if (!candles || candles.s !== 'ok') return []
    return candles.t.map((ts, i) => ({
      date: new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: +candles.c[i].toFixed(2),
    }))
  }, [candles])

  const { totalValue, totalDayChange } = useMemo(() => {
    const vals = Object.values(quotes)
    return {
      totalValue: vals.reduce((sum, q) => sum + q.c, 0),
      totalDayChange: vals.reduce((sum, q) => sum + (q.d ?? 0), 0),
    }
  }, [quotes])

  const addSymbol = async () => {
    const sym = newSymbol.trim().toUpperCase()
    if (!sym || watchlist.includes(sym)) return
    setAddError(null)
    const { error } = await supabase
      .from('watchlist')
      .insert({ user_id: session!.user.id, symbol: sym })
    if (error) {
      setAddError(error.message)
    } else {
      setWatchlist(prev => [...prev, sym])
      setNewSymbol('')
      if (!selectedSymbol) setSelectedSymbol(sym)
    }
  }

  const removeSymbol = async (sym: string) => {
    await supabase
      .from('watchlist')
      .delete()
      .eq('symbol', sym)
      .eq('user_id', session!.user.id)
    const next = watchlist.filter(s => s !== sym)
    setWatchlist(next)
    setQuotes(prev => { const q = { ...prev }; delete q[sym]; return q })
    if (selectedSymbol === sym) setSelectedSymbol(next[0] ?? '')
  }

  const summaryCardClass =
    'rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 shadow-sm'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">

        {/* Summary cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={summaryCardClass}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Portfolio Value</p>
            {watchlistLoading || quotesLoading
              ? <Skeleton className="mt-2 h-8 w-32" />
              : <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">${totalValue.toFixed(2)}</p>
            }
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            className={summaryCardClass}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Day Change</p>
            {watchlistLoading || quotesLoading
              ? <Skeleton className="mt-2 h-8 w-24" />
              : <p className={`mt-2 text-2xl font-bold ${totalDayChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {totalDayChange >= 0 ? '+' : ''}{totalDayChange.toFixed(2)}
                </p>
            }
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.35 }}
            className={`${summaryCardClass} col-span-2`}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Symbols Tracked</p>
            {watchlistLoading
              ? <Skeleton className="mt-2 h-8 w-16" />
              : <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{watchlist.length}</p>
            }
          </motion.div>
        </div>

        {/* Chart */}
        <div className="mb-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {selectedSymbol ? `${selectedSymbol} — Price History` : 'Price History'}
              </h2>
              <p className="text-xs text-gray-400">Last 30 days (daily close)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {watchlist.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSymbol(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    s === selectedSymbol
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {chartLoading || !selectedSymbol ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">
              No chart data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                  width={65}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12, borderRadius: 8,
                    border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value: unknown) => {
                    const v = typeof value === 'number' ? value : 0;
                    return [`$${v.toFixed(2)}`, 'Price'];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Watchlist table */}
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Watchlist</h2>
            <div className="flex items-center gap-2">
              <input
                value={newSymbol}
                onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && addSymbol()}
                placeholder="AAPL"
                maxLength={10}
                className="w-24 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={addSymbol}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {addError && (
            <p className="border-b border-gray-100 dark:border-gray-700 px-6 py-2 text-sm text-red-500">
              {addError}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-3">Symbol</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Change</th>
                  <th className="px-6 py-3">Change %</th>
                  <th className="px-6 py-3">High</th>
                  <th className="px-6 py-3">Low</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {watchlistLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : watchlist.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                      Add a symbol above to get started
                    </td>
                  </tr>
                ) : (
                  watchlist.map(sym => {
                    const q = quotes[sym]
                    const loading = quotesLoading || !q
                    const positive = (q?.d ?? 0) >= 0
                    const posCls = 'text-green-600 dark:text-green-400'
                    const negCls = 'text-red-500 dark:text-red-400'
                    return (
                      <motion.tr
                        key={sym}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => setSelectedSymbol(sym)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{sym}</td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {loading ? <Skeleton className="h-4 w-16" /> : `$${q.c.toFixed(2)}`}
                        </td>
                        <td className={`px-6 py-4 ${positive ? posCls : negCls}`}>
                          {loading ? <Skeleton className="h-4 w-14" /> : `${positive ? '+' : ''}${q.d.toFixed(2)}`}
                        </td>
                        <td className={`px-6 py-4 ${positive ? posCls : negCls}`}>
                          {loading ? <Skeleton className="h-4 w-14" /> : `${positive ? '+' : ''}${q.dp.toFixed(2)}%`}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {loading ? <Skeleton className="h-4 w-14" /> : `$${q.h.toFixed(2)}`}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {loading ? <Skeleton className="h-4 w-14" /> : `$${q.l.toFixed(2)}`}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={e => { e.stopPropagation(); removeSymbol(sym) }}
                            aria-label={`Remove ${sym}`}
                            className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                          >
                            ✕
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-symbol stock cards */}
        {watchlist.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {watchlist.map((sym, i) => (
              <StockCard
                key={sym}
                symbol={sym}
                price={quotes[sym]?.c ?? null}
                change={quotes[sym]?.d ?? null}
                changePercent={quotes[sym]?.dp ?? null}
                loading={quotesLoading || !quotes[sym]}
                index={i}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
