import { memo } from 'react'
import { motion } from 'framer-motion'
import { Skeleton } from './Skeleton'

interface StockCardProps {
  symbol: string
  price: number | null
  change: number | null
  changePercent: number | null
  loading: boolean
  index?: number
}

export const StockCard = memo(function StockCard({
  symbol, price, change, changePercent, loading, index = 0
}: StockCardProps) {
  const positive = (change ?? 0) >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{symbol}</span>
        {loading ? (
          <Skeleton className="h-5 w-14" />
        ) : (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            positive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {positive ? '+' : ''}{changePercent?.toFixed(2)}%
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-1 h-8 w-28" />
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${price?.toFixed(2)}</p>
          <p className={`mt-0.5 text-sm ${positive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {positive ? '▲' : '▼'} {Math.abs(change ?? 0).toFixed(2)}
          </p>
        </>
      )}
    </motion.div>
  )
})
