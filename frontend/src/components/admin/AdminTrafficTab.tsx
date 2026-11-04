import React, { useMemo } from 'react'
import {
  Globe,
  Users,
  Shield,
  Smartphone,
  Monitor,
  TrendingUp,
  Activity,
  RefreshCw,
  Search,
  X,
  ShieldCheck,
  CalendarDays,
  Flame,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import {
  AdminOverview,
  AggregatedVisitorItem,
  LiveVisitLogItem,
} from '@/services/adminService'
import { formatSafeTime } from '@/utils/dateUtils'

const AdminTrafficChart = React.lazy(() => import('@/components/admin/AdminTrafficChart'))

export interface AdminTrafficTabProps {
  overview: AdminOverview
  aggregatedVisitors: AggregatedVisitorItem[]
  liveVisitLogs: LiveVisitLogItem[]
  visitorsLoading: boolean
  visitorFilterType: 'all' | 'members' | 'guests'
  setVisitorFilterType: (v: 'all' | 'members' | 'guests') => void
  visitorSearchTerm: string
  setVisitorSearchTerm: (v: string) => void
  visitorViewMode: 'aggregated' | 'live'
  setVisitorViewMode: (v: 'aggregated' | 'live') => void
  selectedTimeframe: 'day' | 'week' | 'month' | 'all'
  setSelectedTimeframe: (v: 'day' | 'week' | 'month' | 'all') => void
  visitorFilterDate: string
  setVisitorFilterDate: (v: string) => void
  visitorPage: number
  setVisitorPage: (v: number | ((prev: number) => number)) => void
  visitorPageSize: number
  setVisitorPageSize: (v: number) => void
  visitorTotalPages: number
  visitorTotalUnique: number
  visitorTotalLive: number
  visitorTotalLivePages: number
  fetchVisitors: (page?: number, search?: string) => Promise<void>
  formatRelativeTime: (isoString: string | null) => string
  getVehicleIcon: (avatar: string) => string
}

export const AdminTrafficTab: React.FC<AdminTrafficTabProps> = ({
  overview,
  aggregatedVisitors,
  liveVisitLogs,
  visitorsLoading,
  visitorFilterType,
  setVisitorFilterType,
  visitorSearchTerm,
  setVisitorSearchTerm,
  visitorViewMode,
  setVisitorViewMode,
  selectedTimeframe,
  setSelectedTimeframe,
  visitorFilterDate,
  setVisitorFilterDate,
  visitorPage,
  setVisitorPage,
  visitorPageSize,
  setVisitorPageSize,
  visitorTotalPages,
  visitorTotalUnique,
  visitorTotalLive,
  visitorTotalLivePages,
  fetchVisitors,
  formatRelativeTime,
  getVehicleIcon,
}) => {
  const chartData = useMemo(() => {
    if (!overview) return []
    if (selectedTimeframe === 'month' && overview.traffic_trend_30days && overview.traffic_trend_30days.length > 0) {
      return overview.traffic_trend_30days
    }
    return overview.traffic_trend_7days || []
  }, [overview, selectedTimeframe])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 4 Cards Detail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-blue-300 font-bold mb-2">
            <span>TỔNG LƯỢT TRUY CẬP</span>
            <Globe className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white">{overview.total_visits}</div>
          <div className="text-xs text-slate-400 mt-1">
            Hôm nay: <b className="text-emerald-400">+{overview.today_visits} lượt</b>
          </div>
        </div>

        {/* Card 2: Guests */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-cyan-300 font-bold mb-2">
            <span>KHÁCH VÃNG LAI (GUESTS)</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white">{overview.guest_visits}</div>
          <div className="text-xs text-slate-400 mt-1">
            <b className="text-cyan-300">{overview.unique_guests} khách duy nhất</b> ({overview.today_guest_visits} lượt hôm nay)
          </div>
        </div>

        {/* Card 3: Members */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-amber-300 font-bold mb-2">
            <span>THÀNH VIÊN ĐÃ ĐĂNG NHẬP</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white">{overview.member_visits}</div>
          <div className="text-xs text-slate-400 mt-1">
            <b className="text-amber-300">{overview.unique_members} thành viên</b> ({overview.today_member_visits} lượt hôm nay)
          </div>
        </div>

        {/* Card 4: Devices */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-purple-300 font-bold mb-2">
            <span>THIẾT BỊ TRUY CẬP</span>
            <Smartphone className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-center gap-3 text-2xl font-black text-white">
            <span className="flex items-center gap-1 text-purple-300 text-lg">
              <Smartphone className="w-4 h-4" /> {overview.mobile_visits}
            </span>
            <span className="text-slate-600">/</span>
            <span className="flex items-center gap-1 text-slate-300 text-lg">
              <Monitor className="w-4 h-4" /> {overview.desktop_visits}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Điện thoại di động & Máy tính bàn
          </div>
        </div>
      </div>

      {/* Trend Chart (7-day or 30-day) */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>
                {selectedTimeframe === 'month'
                  ? 'Xu Hướng Truy Cập 30 Ngày Gần Nhất (Khách Vãng Lai vs Thành Viên)'
                  : 'Xu Hướng Truy Cập 7 Ngày Gần Nhất (Khách Vãng Lai vs Thành Viên)'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Biểu đồ đo lường mức độ tương tác và bạn bè vào web mỗi ngày
            </p>
          </div>

          {/* Switcher 7d / 30d */}
          <div className="flex items-center gap-1 bg-[#162032] p-1 rounded-xl border border-slate-700/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedTimeframe('week')}
              className={`px-3 py-1 rounded-lg transition ${
                selectedTimeframe !== 'month'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              7 Ngày
            </button>
            <button
              type="button"
              onClick={() => setSelectedTimeframe('month')}
              className={`px-3 py-1 rounded-lg transition ${
                selectedTimeframe === 'month'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              30 Ngày
            </button>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          {chartData && chartData.length > 0 ? (
            <React.Suspense
              fallback={
                <div className="h-full flex items-center justify-center text-xs text-slate-400 animate-pulse">
                  Đang tải biểu đồ lưu lượng...
                </div>
              }
            >
              <AdminTrafficChart chartData={chartData} />
            </React.Suspense>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Chưa có đủ dữ liệu lưu lượng
            </div>
          )}
        </div>
      </div>

      {/* ── BẢNG DANH SÁCH NGƯỜI TRUY CẬP & NHẬT KÝ THIẾT BỊ ── */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Chi Tiết Người Truy Cập & Thiết Bị Vào Web</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                  {visitorViewMode === 'aggregated' ? `${aggregatedVisitors.length} người` : `${liveVisitLogs.length} lượt`}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Định danh theo Tên (Thành viên) và IP (Khách vãng lai), thống kê số lần vào & thiết bị sử dụng
              </p>
            </div>
          </div>

          {/* Right controls: Refresh & View Mode */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#162032] p-1 rounded-xl border border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setVisitorViewMode('aggregated')}
                className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                  visitorViewMode === 'aggregated'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Theo Người</span>
              </button>
              <button
                type="button"
                onClick={() => setVisitorViewMode('live')}
                className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                  visitorViewMode === 'live'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Nhật Ký Live</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => fetchVisitors()}
              disabled={visitorsLoading}
              className="p-2 rounded-xl bg-[#162032] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${visitorsLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={visitorSearchTerm}
              onChange={(e) => setVisitorSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setVisitorPage(1)
                  fetchVisitors(1)
                }
              }}
              placeholder="Tìm theo tên hiển thị, @username hoặc địa chỉ IP..."
              className="w-full pl-9 pr-9 py-2 bg-black/40 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 text-xs transition"
            />
            {visitorSearchTerm && (
              <button
                type="button"
                onClick={() => {
                  setVisitorSearchTerm('')
                  setVisitorPage(1)
                  fetchVisitors(1, '')
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#162032] p-1 rounded-xl border border-slate-700/60 text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setVisitorFilterType('all')}
              className={`px-3 py-1 rounded-lg transition whitespace-nowrap ${
                visitorFilterType === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất Cả ({aggregatedVisitors.length})
            </button>
            <button
              type="button"
              onClick={() => setVisitorFilterType('members')}
              className={`px-3 py-1 rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
                visitorFilterType === 'members'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Thành Viên ({aggregatedVisitors.filter(v => v.is_member).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setVisitorFilterType('guests')}
              className={`px-3 py-1 rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
                visitorFilterType === 'guests'
                  ? 'bg-cyan-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Khách Vãng Lai ({aggregatedVisitors.filter(v => !v.is_member).length})</span>
            </button>
          </div>
        </div>

        {/* BỘ CHỌN & LỌC THEO NGÀY CỤ THỂ */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-400 font-bold">
              <CalendarDays className="w-4 h-4 text-amber-400" />
              <span>Lọc theo ngày:</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setVisitorFilterDate('')
                setVisitorPage(1)
              }}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                !visitorFilterDate
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-[#162032] text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              Mọi ngày ({selectedTimeframe === 'day' ? 'Hôm nay' : selectedTimeframe === 'week' ? '7 ngày' : selectedTimeframe === 'month' ? '30 ngày' : 'Toàn bộ'})
            </button>

            {/* Nút nhanh Hôm nay / Hôm qua */}
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0]
              const yest = new Date()
              yest.setDate(yest.getDate() - 1)
              const yestStr = yest.toISOString().split('T')[0]
              return (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setVisitorFilterDate(todayStr)
                      setVisitorPage(1)
                    }}
                    className={`px-2.5 py-1 rounded-lg transition font-medium ${
                      visitorFilterDate === todayStr
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                        : 'bg-[#162032] text-slate-400 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    Hôm Nay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVisitorFilterDate(yestStr)
                      setVisitorPage(1)
                    }}
                    className={`px-2.5 py-1 rounded-lg transition font-medium ${
                      visitorFilterDate === yestStr
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                        : 'bg-[#162032] text-slate-400 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    Hôm Qua
                  </button>
                </>
              )
            })()}

            {/* Date Input */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-slate-700/80 rounded-xl px-2.5 py-1">
              <span className="text-[11px] text-slate-400">Chọn ngày:</span>
              <input
                type="date"
                value={visitorFilterDate}
                onChange={(e) => {
                  setVisitorFilterDate(e.target.value)
                  setVisitorPage(1)
                }}
                className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark]"
              />
              {visitorFilterDate && (
                <button
                  type="button"
                  onClick={() => {
                    setVisitorFilterDate('')
                    setVisitorPage(1)
                  }}
                  className="text-slate-400 hover:text-white p-0.5 ml-1"
                  title="Bỏ lọc ngày"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {visitorFilterDate && (
            <span className="text-[11px] text-amber-300 font-semibold px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20">
              📅 Đang xem nhật ký ngày: <b>{visitorFilterDate}</b>
            </span>
          )}
        </div>

        {/* Content Table */}
        {visitorsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-xs">Đang tải danh sách người truy cập...</span>
          </div>
        ) : visitorViewMode === 'aggregated' ? (
          /* CHẾ ĐỘ 1: BẢNG TỔNG HỢP THEO NGƯỜI */
          aggregatedVisitors.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
              Chưa tìm thấy người truy cập nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#162032] text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Người Truy Cập (Tên / IP)</th>
                    <th className="py-3 px-4 text-center">Số Lần Vào Web</th>
                    <th className="py-3 px-4">Thiết Bị & Nền Tảng</th>
                    <th className="py-3 px-4">Trang Xem Gần Nhất</th>
                    <th className="py-3 px-4">Hoạt Động Gần Nhất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-black/20">
                  {aggregatedVisitors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition">
                      {/* Cột 1: Tên hoặc IP */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {v.is_member ? (
                            <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-lg shrink-0">
                              {getVehicleIcon(v.avatar || 'cyber_car')}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                              <Globe className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white truncate">
                                {v.identity}
                              </span>
                              {v.is_member ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                                  Thành viên
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold shrink-0">
                                  Khách IP
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate">
                              {v.is_member && v.username ? (
                                <span>@{v.username} • IP: {v.ip_address}</span>
                              ) : (
                                <span>IP: {v.ip_address}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Số lần vào */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 font-extrabold text-xs shadow-sm">
                          <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span>{v.visit_count} lần</span>
                        </span>
                      </td>

                      {/* Cột 3: Thiết bị & Nền tảng */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-800/80 text-purple-300 shrink-0">
                            {v.device_type === 'mobile' ? (
                              <Smartphone className="w-4 h-4" />
                            ) : (
                              <Monitor className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-white font-semibold truncate">
                              {v.browser}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {v.os} • {v.device_type === 'mobile' ? 'Điện thoại' : 'Máy tính'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 4: Đường dẫn xem gần nhất */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700 truncate inline-block max-w-[160px]">
                          {v.last_path || '/'}
                        </span>
                      </td>

                      {/* Cột 5: Hoạt động gần nhất */}
                      <td className="py-3 px-4">
                        <div className="text-slate-200 font-medium">
                          {formatRelativeTime(v.last_visit)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Lần đầu: {formatRelativeTime(v.first_visit)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* CHẾ ĐỘ 2: NHẬT KÝ LIVE STREAM */
          liveVisitLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
              Chưa có lượt truy cập nào được ghi nhận.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#162032] text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4">Người Truy Cập</th>
                    <th className="py-3 px-4">Thiết Bị & Trình Duyệt</th>
                    <th className="py-3 px-4">Trang Xem (Path)</th>
                    <th className="py-3 px-4">Địa Chỉ IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-black/20">
                  {liveVisitLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        <div className="text-white font-medium">
                          {formatRelativeTime(log.created_at)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatSafeTime(log.created_at)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {log.is_member ? (
                            <>
                              <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-xs shrink-0">
                                {getVehicleIcon(log.avatar || 'cyber_car')}
                              </div>
                              <div>
                                <div className="font-bold text-white truncate max-w-[150px]">
                                  {log.display_name || log.username || 'Thành viên'}
                                </div>
                                {log.username && (
                                  <div className="text-[10px] text-amber-400/80 font-mono">
                                    @{log.username}
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                              <span className="font-mono text-cyan-300">
                                {log.ip_address || 'Khách vãng lai'}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {log.device_type === 'mobile' ? (
                            <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                          ) : (
                            <Monitor className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span className="text-slate-200">
                            {log.browser} • {log.os}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800/90 text-cyan-300 border border-slate-700">
                          {log.path || '/'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {log.ip_address || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* BỘ PHÂN TRANG (PAGINATION) - TRÁNH TẢI DỒN GÂY LAG */}
        {!visitorsLoading && (
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            {/* Trạng thái hiển thị */}
            <div className="flex items-center gap-2">
              <span>
                Hiển thị{' '}
                <b className="text-white">
                  {Math.min(
                    (visitorPage - 1) * visitorPageSize + 1,
                    visitorViewMode === 'aggregated' ? visitorTotalUnique : visitorTotalLive
                  )}
                  -
                  {Math.min(
                    visitorPage * visitorPageSize,
                    visitorViewMode === 'aggregated' ? visitorTotalUnique : visitorTotalLive
                  )}
                </b>{' '}
                / Tổng số{' '}
                <b className="text-cyan-400">
                  {visitorViewMode === 'aggregated' ? visitorTotalUnique : visitorTotalLive}
                </b>{' '}
                {visitorViewMode === 'aggregated' ? 'người' : 'lượt'}
              </span>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1.5">
                <span>Mỗi trang:</span>
                <select
                  value={visitorPageSize}
                  onChange={(e) => {
                    setVisitorPageSize(Number(e.target.value))
                    setVisitorPage(1)
                  }}
                  className="bg-[#162032] border border-slate-700/80 rounded-lg px-2 py-0.5 text-white font-medium focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Nút chuyển trang */}
            {(() => {
              const currentTotalPages =
                visitorViewMode === 'aggregated' ? visitorTotalPages : visitorTotalLivePages
              if (currentTotalPages <= 1) return null

              const handlePageChange = (newPage: number) => {
                if (newPage < 1 || newPage > currentTotalPages) return
                setVisitorPage(newPage)
                fetchVisitors(newPage)
              }

              return (
                <div className="flex items-center gap-1 bg-[#162032] p-1 rounded-xl border border-slate-700/60 font-bold">
                  <button
                    type="button"
                    onClick={() => handlePageChange(1)}
                    disabled={visitorPage <= 1}
                    className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition"
                    title="Trang đầu"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange(visitorPage - 1)}
                    disabled={visitorPage <= 1}
                    className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition"
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: currentTotalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === currentTotalPages || Math.abs(p - visitorPage) <= 1)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && p - arr[idx - 1] > 1 && (
                            <span className="px-1 text-slate-500">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePageChange(p)}
                            className={`w-7 h-7 rounded-lg text-xs transition ${
                              visitorPage === p
                                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(visitorPage + 1)}
                    disabled={visitorPage >= currentTotalPages}
                    className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition"
                    title="Trang sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentTotalPages)}
                    disabled={visitorPage >= currentTotalPages}
                    className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition"
                    title="Trang cuối"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminTrafficTab
