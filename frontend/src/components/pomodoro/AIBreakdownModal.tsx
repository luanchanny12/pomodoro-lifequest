import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Info,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  focusService,
  type AIBreakdownLogItem,
  type AIBreakdownProposal,
  type AIBreakdownTaskItem,
  type DeadlineItem,
} from '@/services/focusService'
import { getLocalTodayYmd } from '@/utils/deadlineUtils'
import { formatSafeDate, parseSafeDate } from '@/utils/dateUtils'

interface AIBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (batchId?: string) => Promise<void> | void
  deadlines?: DeadlineItem[]
}

type TabType = 'breakdown' | 'import' | 'history'

export const AIBreakdownModal: React.FC<AIBreakdownModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  deadlines = [],
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('breakdown')
  const todayYmd = getLocalTodayYmd()

  // Form State (Tab 1)
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState(() => {
    // Default 5 days in the future
    const d = new Date()
    d.setDate(d.getDate() + 5)
    return getLocalTodayYmd(d)
  })
  const [dailyHours, setDailyHours] = useState('1.5')
  const [notesOrSyllabus, setNotesOrSyllabus] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [proposal, setProposal] = useState<AIBreakdownProposal | null>(null)
  const [editableTasks, setEditableTasks] = useState<AIBreakdownTaskItem[]>([])
  const [submittingApply, setSubmittingApply] = useState(false)

  // Import State (Tab 2)
  const [rawText, setRawText] = useState('')
  const [parsingText, setParsingText] = useState(false)
  const [importedTasks, setImportedTasks] = useState<AIBreakdownTaskItem[]>([])
  const [importTitle, setImportTitle] = useState('Import Thời Khóa Biểu')
  const [submittingImport, setSubmittingImport] = useState(false)

  // History State (Tab 3)
  const [historyLogs, setHistoryLogs] = useState<AIBreakdownLogItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [rollingBackId, setRollingBackId] = useState<string | null>(null)

  // Fetch history when switching to tab 3
  const loadHistory = async () => {
    try {
      setLoadingHistory(true)
      const logs = await focusService.getAIBreakdownHistory()
      setHistoryLogs(Array.isArray(logs) ? logs : [])
    } catch {
      setHistoryLogs([])
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      loadHistory()
    }
  }, [isOpen, activeTab])

  if (!isOpen) return null

  // 1. Phân tích & Tạo đề xuất bằng AI
  const handlePreviewBreakdown = async () => {
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      toast.error('Vui lòng nhập tên môn thi hoặc nhiệm vụ lớn!')
      return
    }
    if (!targetDate) {
      toast.error('Vui lòng chọn ngày hạn chót/ngày thi!')
      return
    }

    try {
      setAnalyzing(true)
      const res = await focusService.previewAIBreakdown({
        title: cleanTitle,
        target_date: targetDate,
        daily_hours: Number(dailyHours) || 1.5,
        notes_or_syllabus: notesOrSyllabus.trim() || undefined,
        quadrant: 1,
      })
      setProposal(res)
      setEditableTasks(res.tasks)
      toast.success('✨ AI đã phân tích và lập kế hoạch đề xuất xong!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lập kế hoạch lúc này'
      toast.error(msg)
    } finally {
      setAnalyzing(false)
    }
  }

  // 2. Người dùng phê duyệt -> Lưu vào database
  const handleApproveAndApply = async () => {
    if (!proposal || editableTasks.length === 0) return

    try {
      setSubmittingApply(true)
      const res = await focusService.applyAIBreakdown({
        title: proposal.title,
        target_date: proposal.target_date,
        explanation: proposal.explanation,
        tasks: editableTasks,
        create_parent_goal: true,
      })

      toast.success(res.message || '🎉 Đã thêm các nhiệm vụ vào lịch thành công!')
      await onSuccess(res.batch_id)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu lịch'
      toast.error(msg)
    } finally {
      setSubmittingApply(false)
    }
  }

  // Chỉnh sửa hoặc xóa 1 task trong proposal xem trước
  const handleRemoveTaskFromProposal = (index: number) => {
    setEditableTasks((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateTaskTitle = (index: number, newTitle: string) => {
    setEditableTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, title: newTitle } : t))
    )
  }

  // 3. Hoàn tác một batch đã tạo
  const handleRollbackBatch = async (batchId: string) => {
    try {
      setRollingBackId(batchId)
      const res = await focusService.rollbackAIBreakdown(batchId)
      toast.success(res.message || '↩️ Đã hoàn tác thành công!')
      await loadHistory()
      await onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể hoàn tác'
      toast.error(msg)
    } finally {
      setRollingBackId(null)
    }
  }

  // 4. Bóc tách văn bản thô dán từ website/tài liệu
  const handleParseScheduleText = async () => {
    if (!rawText.trim()) {
      toast.error('Vui lòng dán văn bản thời khóa biểu hoặc đề cương!')
      return
    }

    try {
      setParsingText(true)
      const res = await focusService.parseScheduleTextWithAI(rawText.trim(), targetDate)
      if (res.tasks && res.tasks.length > 0) {
        setImportedTasks(res.tasks)
        toast.success(`🤖 AI đã trích xuất được ${res.tasks.length} mục!`)
      } else {
        toast.info('Không tìm thấy môn thi nào trong đoạn văn bản.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi bóc tách văn bản'
      toast.error(msg)
    } finally {
      setParsingText(false)
    }
  }

  // 5. Upload File CSV / JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (!content) return

      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content)
          const list = Array.isArray(parsed) ? parsed : parsed.items || parsed.tasks || []
          const normalized: AIBreakdownTaskItem[] = list.map((item: Record<string, unknown>) => ({
            title: String(item.title || item.name || 'Nhiệm vụ'),
            date: String(item.date || todayYmd),
            quadrant: Number(item.quadrant) || 1,
            notes: item.notes ? String(item.notes) : undefined,
            duration_minutes: Number(item.duration_minutes) || 60,
          }))
          setImportedTasks(normalized)
          toast.success(`📁 Đã nạp ${normalized.length} mục từ file JSON!`)
        } else {
          // Parse CSV
          const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
          if (lines.length < 2) {
            toast.error('File CSV phải có ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu!')
            return
          }
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
          const titleIdx = headers.findIndex((h) => h.includes('title') || h.includes('môn') || h.includes('task'))
          const dateIdx = headers.findIndex((h) => h.includes('date') || h.includes('ngày'))
          const notesIdx = headers.findIndex((h) => h.includes('note') || h.includes('phòng') || h.includes('ghi chú'))

          const normalized: AIBreakdownTaskItem[] = []
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
            if (cols.length === 0 || !cols[0]) continue
            const t = titleIdx >= 0 ? cols[titleIdx] : cols[0]
            const d = dateIdx >= 0 ? cols[dateIdx] : todayYmd
            const n = notesIdx >= 0 ? cols[notesIdx] : ''
            if (t) {
              normalized.push({
                title: t,
                date: d.slice(0, 10),
                quadrant: 1,
                notes: n,
                duration_minutes: 60,
              })
            }
          }
          setImportedTasks(normalized)
          toast.success(`📁 Đã nạp ${normalized.length} mục từ file CSV!`)
        }
      } catch (err: unknown) {
        toast.error('Không thể đọc file. Vui lòng kiểm tra định dạng CSV hoặc JSON!')
      }
    }
    reader.readAsText(file)
  }

  // Tải file CSV mẫu
  const handleDownloadSampleCsv = () => {
    const csvContent =
      'title,date,time,notes,quadrant\n' +
      'Lịch thi: Thương mại điện tử,2026-11-09,18:50 - 20:20 (Ca 6),Phòng A4-201.202 | Trắc nghiệm,1\n' +
      'Nộp bài tập lớn Công nghệ Web,2026-11-12,23:59,Nộp link GitHub qua portal,1\n' +
      'Thi cuối kỳ Cơ sở dữ liệu,2026-11-16,07:30 - 09:00 (Ca 1),Phòng A2-302,1\n'

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'mau_lich_thi_lifequest.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Lưu các task đã import vào database
  const handleApplyImportedTasks = async () => {
    if (importedTasks.length === 0) return
    try {
      setSubmittingImport(true)
      const res = await focusService.importTasksBulk({
        title: importTitle.trim() || 'Import Danh Sách Ngoài',
        tasks: importedTasks,
      })
      toast.success(res.message || '🎉 Đã import danh sách thành công!')
      await onSuccess(res.batch_id)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể import lúc này'
      toast.error(msg)
    } finally {
      setSubmittingImport(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-2 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/25 to-purple-500/25 rounded-xl border border-indigo-500/40 text-indigo-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate flex items-center gap-2">
                AI Chia Nhỏ Deadline & Lên Lịch Tự Động
              </h2>
              <p className="text-xs text-slate-400">
                Lên lộ trình từng ngày • Xem giải trình chi tiết • Duyệt mới lưu • Hoàn tác 1-click
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-slate-800 bg-slate-950/60 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('breakdown')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'breakdown'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✨ AI Chia Nhỏ Deadline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>📁 Import CSV / JSON & Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>🕒 Lịch Sử & Hoàn Tác</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* TAB 1: AI BREAKDOWN */}
          {activeTab === 'breakdown' && (
            <div className="space-y-4">
              {/* Form Input */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Mục Tiêu Lớn Cần Phân Rã
                  </span>

                  {deadlines.length > 0 && (
                    <select
                      onChange={(e) => {
                        const selectedId = Number(e.target.value)
                        const found = deadlines.find((d) => d.id === selectedId)
                        if (found) {
                          setTitle(found.title)
                          if (found.date) setTargetDate(found.date.slice(0, 10))
                          if (found.notes) setNotesOrSyllabus(found.notes)
                        }
                      }}
                      className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 focus:outline-none"
                    >
                      <option value="">Chọn từ deadline có sẵn...</option>
                      {deadlines.map((d) => (
                        <option key={`${d.type}-${d.id}`} value={d.id}>
                          {d.title} ({d.date})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-7">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Tên môn thi / đồ án lớn:
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="VD: Ôn thi Cuối Kỳ: Thương mại điện tử"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Ngày thi / Hạn chót:
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      min={todayYmd}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Số giờ/ngày:
                    </label>
                    <select
                      value={dailyHours}
                      onChange={(e) => setDailyHours(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-400"
                    >
                      <option value="1">1.0h</option>
                      <option value="1.5">1.5h</option>
                      <option value="2">2.0h</option>
                      <option value="3">3.0h</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Ghi chú đề cương / Nội dung các chương (để AI chia sát thực tế):
                  </label>
                  <textarea
                    rows={2}
                    value={notesOrSyllabus}
                    onChange={(e) => setNotesOrSyllabus(e.target.value)}
                    placeholder="VD: Chương 1 B2B B2C; Chương 3 Ví điện tử; Chương 4 Bảo mật SSL/TLS; Giải đề thi thử 90p..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Tất cả task chia nhỏ sẽ được xếp vào <b>Ô 1 (Làm ngay)</b> trên lịch.</span>
                  </div>

                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={handlePreviewBreakdown}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI đang phân tích...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Phân Tích & Lập Đề Xuất</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Proposal & Review Gate */}
              {proposal && (
                <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/95 p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
                  {/* AI Explanation Banner */}
                  <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-start gap-3">
                    <span className="text-xl shrink-0">💡</span>
                    <div className="space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-indigo-300">
                        Giải Trình Lộ Trình Của AI:
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {proposal.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Task List Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span className="font-bold text-slate-300">
                        Danh sách nhiệm vụ đề xuất (Bạn có thể sửa tên hoặc xóa trước khi duyệt):
                      </span>
                      <span>
                        Tổng: <b>{editableTasks.length} nhiệm vụ Ô 1</b>
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                      {editableTasks.map((task, idx) => {
                        const parsedDate = parseSafeDate(task.date)
                        const formatted = parsedDate ? formatSafeDate(parsedDate, 'dd/MM') : task.date

                        return (
                          <div
                            key={idx}
                            className="rounded-xl border border-slate-700/80 bg-slate-800/80 p-2.5 sm:p-3 flex items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-bold text-[11px] shrink-0">
                                {formatted}
                              </span>

                              <input
                                type="text"
                                value={task.title}
                                onChange={(e) => handleUpdateTaskTitle(idx, e.target.value)}
                                className="bg-transparent text-xs sm:text-sm font-semibold text-white focus:outline-none focus:bg-slate-700/50 px-1.5 py-0.5 rounded w-full"
                              />
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-slate-400 hidden sm:inline">
                                {task.duration_minutes || 60}p
                              </span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                Ô 1
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTaskFromProposal(idx)}
                                title="Bỏ nhiệm vụ này"
                                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Confirmation Gate Footer */}
                  <div className="p-3.5 rounded-xl bg-slate-800/90 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-300 space-y-0.5">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        🛡️ Dữ liệu cũ của bạn được giữ nguyên 100%!
                      </span>
                      <p className="text-slate-400">
                        Chỉ khi bấm Đồng ý, hệ thống mới chính thức lưu {editableTasks.length} nhiệm vụ này vào lịch.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setProposal(null)}
                        className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Làm lại
                      </button>
                      <button
                        type="button"
                        disabled={submittingApply || editableTasks.length === 0}
                        onClick={handleApproveAndApply}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {submittingApply ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang lưu...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 stroke-[2.5]" />
                            <span>Đồng Ý & Đẩy Lên Lịch</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMPORT CSV / JSON / TEXT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-indigo-400" />
                      Nhập Dữ Liệu Lịch Từ Bên Ngoài
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Hỗ trợ file CSV, JSON hoặc dán văn bản thời khóa biểu thô để AI tự trích xuất.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-medium cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Tải file CSV mẫu</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* File Upload Box */}
                  <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 flex flex-col items-center justify-center text-center space-y-2.5">
                    <FileSpreadsheet className="w-8 h-8 text-indigo-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Tải lên file .CSV hoặc .JSON</p>
                      <p className="text-[11px] text-slate-400">Cột: title, date, time, notes, quadrant</p>
                    </div>
                    <label className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-sm">
                      <span>Chọn file từ máy</span>
                      <input
                        type="file"
                        accept=".csv,.json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Paste Raw Text Box */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-400 block">
                      Hoặc dán thời khóa biểu / lịch thi dạng chữ:
                    </label>
                    <textarea
                      rows={3}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="VD: Lịch thi: Triết học 15/11/2026 phòng A4-301, Toán cao cấp 18/11/2026..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      type="button"
                      disabled={parsingText}
                      onClick={handleParseScheduleText}
                      className="w-full py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {parsingText ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>AI đang bóc tách...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>Bật AI Trích Xuất Nhiệm Vụ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Imported Preview Table */}
              {importedTasks.length > 0 && (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/95 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">
                      Danh sách đã bóc tách được ({importedTasks.length} nhiệm vụ):
                    </span>
                    <button
                      type="button"
                      onClick={() => setImportedTasks([])}
                      className="text-xs text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      Xóa danh sách
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {importedTasks.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-700/80 bg-slate-800/80 p-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[11px] shrink-0">
                            {item.date}
                          </span>
                          <span className="font-semibold text-white truncate">{item.title}</span>
                          {item.notes && (
                            <span className="text-slate-400 text-[11px] truncate hidden sm:inline">
                              • {item.notes}
                            </span>
                          )}
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium text-[10px] shrink-0">
                          Ô 1
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-xs text-slate-400">
                      Đợt import này cũng sẽ được tạo Batch ID để bạn có thể hoàn tác nếu cần.
                    </span>
                    <button
                      type="button"
                      disabled={submittingImport}
                      onClick={handleApplyImportedTasks}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer shadow-md disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {submittingImport ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang nạp...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Đẩy Vào Lịch Ngay</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ROLLBACK HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-400" />
                    Lịch Sử Các Lần AI Chia Lịch & Nạp Dữ Liệu
                  </h3>
                  <button
                    type="button"
                    onClick={loadHistory}
                    disabled={loadingHistory}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Làm mới
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Nếu bạn thấy lịch chia nào không phù hợp, bấm <b>Hoàn tác</b> để xóa sạch các task đó khỏi lịch.
                </p>

                {loadingHistory ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Đang tải lịch sử...
                  </div>
                ) : (!historyLogs || historyLogs.length === 0) ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
                    <History className="w-6 h-6 text-slate-500" />
                    <p>Chưa có đợt chia lịch AI nào trong tài khoản.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                    {historyLogs.map((log) => {
                      const isBusy = rollingBackId === log.batch_id
                      const createdDate = log.created_at
                        ? formatSafeDate(log.created_at, 'HH:mm dd/MM/yyyy')
                        : ''

                      return (
                        <div
                          key={log.batch_id}
                          className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                            log.is_reverted
                              ? 'border-slate-800 bg-slate-950/40 opacity-60'
                              : 'border-slate-700/80 bg-slate-800/80'
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h5
                                className={`text-xs sm:text-sm font-bold truncate ${
                                  log.is_reverted ? 'line-through text-slate-400' : 'text-white'
                                }`}
                              >
                                {log.title}
                              </h5>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                  log.is_reverted
                                    ? 'bg-slate-800 text-slate-400'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}
                              >
                                {log.is_reverted ? 'Đã hoàn tác' : 'Đang hiệu lực'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Đã thêm {log.task_count} nhiệm vụ • {createdDate}
                            </p>
                          </div>

                          <div className="shrink-0">
                            {log.is_reverted ? (
                              <span className="text-xs text-slate-500 italic">Đã xóa khỏi lịch</span>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleRollbackBatch(log.batch_id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all disabled:opacity-60 cursor-pointer"
                              >
                                {isBusy ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Đang hoàn tác...</span>
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Hoàn tác lần này</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
