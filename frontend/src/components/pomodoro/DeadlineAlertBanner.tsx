import React, { useState } from 'react'
import { AlertTriangle, ChevronRight, X, Flame } from 'lucide-react'

interface DeadlineAlertBannerProps {
  count: number
  onOpen: () => void
}

export const DeadlineAlertBanner: React.FC<DeadlineAlertBannerProps> = ({ count, onOpen }) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(false)

  if (count <= 0 || isDismissed) return null

  return (
    <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-red-900/30 to-amber-950/40 border border-rose-500/40 backdrop-blur-md shadow-lg shadow-rose-950/20 flex items-center justify-between gap-3 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-rose-500/25 border border-rose-500/40 flex items-center justify-center text-rose-300 flex-shrink-0 animate-pulse">
          <Flame className="w-5 h-5 fill-current" />
        </div>
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 flex-wrap">
            <span>Cảnh báo Deadline:</span>
            <span className="text-rose-300 font-extrabold">
              Bạn có {count} hạn chót khẩn cấp cần giải quyết!
            </span>
          </div>
          <p className="text-[11px] text-white/60 truncate">
            Có mục tiêu hoặc công việc đã quá hạn hoặc hết hạn hôm nay. Hãy tập trung xử lý ngay nhé!
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onOpen}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:opacity-95 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1"
        >
          <span>Xem lịch</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition"
          title="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
