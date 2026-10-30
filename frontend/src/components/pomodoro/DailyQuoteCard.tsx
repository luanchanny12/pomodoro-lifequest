import React, { useState } from 'react'
import { Sparkles, RefreshCw, Copy, Check, Quote } from 'lucide-react'
import { toast } from 'sonner'
import {
  MotivationalQuote,
  getDailyQuote,
  getRandomQuote,
} from '@/data/motivationalQuotes'

const DailyQuoteCardComponent: React.FC = () => {
  const [quote, setQuote] = useState<MotivationalQuote>(getDailyQuote)
  const [isCopied, setIsCopied] = useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  const handleNextQuote = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      const next = getRandomQuote(quote.id)
      setQuote(next)
      setIsRefreshing(false)
      toast.success('Đã buff thêm câu nói động lực mới! Cố lên nhé! 🔥')
    }, 200)
  }

  const handleCopyQuote = () => {
    navigator.clipboard.writeText(`"${quote.quote}" - ${quote.author}`)
    setIsCopied(true)
    toast.success('Đã sao chép câu động lực')
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden transition-all duration-300 hover:border-white/35">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header with Tag & Actions */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1 shadow-sm">
            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
            {quote.energyTag}
          </span>
          <span className="text-[11px] text-white/50 hidden sm:inline">
            • Buff động lực hôm nay
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Refresh / Next quote button */}
          <button
            onClick={handleNextQuote}
            disabled={isRefreshing}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/15 rounded-lg text-xs flex items-center gap-1 transition"
            title="Đổi câu động lực khác"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-[11px] hidden sm:inline">Buff câu khác</span>
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopyQuote}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/15 rounded-lg text-xs transition"
            title="Sao chép câu nói"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Quote Text */}
      <div className="relative pl-6 pr-2">
        <Quote className="w-4 h-4 text-white/30 absolute left-0 top-0.5 fill-current" />
        <p className="text-sm sm:text-base font-medium text-white/95 leading-relaxed tracking-wide italic">
          "{quote.quote}"
        </p>
        <p className="text-right text-xs font-semibold text-white/70 mt-2">
          — {quote.author}
        </p>
      </div>
    </div>
  )
}

export const DailyQuoteCard = React.memo(DailyQuoteCardComponent)
