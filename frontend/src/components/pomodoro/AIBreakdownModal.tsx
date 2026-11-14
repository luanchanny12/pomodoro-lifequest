import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  Headphones,
  HelpCircle,
  History,
  Info,
  Lightbulb,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  focusService,
  type AIBreakdownLogItem,
  type AIBreakdownProposal,
  type AIBreakdownTaskItem,
  type DeadlineItem,
  type NotebookLMSourceItem,
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
type StudioSubTab = 'schedule' | 'audio' | 'studyguide' | 'qa'

export const AIBreakdownModal: React.FC<AIBreakdownModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  deadlines = [],
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('breakdown')
  const [studioSubTab, setStudioSubTab] = useState<StudioSubTab>('schedule')
  const todayYmd = getLocalTodayYmd()

  // Form State (Tab 1)
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState(() => {
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

  // NotebookLM Sources State
  const [sources, setSources] = useState<NotebookLMSourceItem[]>([])
  const [uploadingSource, setUploadingSource] = useState(false)

  // Audio Overview State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  // Q&A with Sources State
  const [questionText, setQuestionText] = useState('')
  const [askingQuestion, setAskingQuestion] = useState(false)
  const [qaList, setQaList] = useState<
    Array<{ q: string; a: string; citations?: string[]; suggested_followups?: string[] }>
  >([])

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

  // Clean speech synthesis on unmount or close
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const handleModalClose = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsPlayingAudio(false)
    onClose()
  }

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

  // 1. Upload Source Document (PDF, DOCX, TXT)
  const handleUploadSourceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingSource(true)
      const res = await focusService.uploadNotebookLMSource(file)
      setSources((prev) => [...prev, res])
      toast.success(`📘 Đã nạp thành công tài liệu: ${res.name} (${res.words_count} từ)`)
      if (!title && res.name) {
        const inferred = res.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        setTitle(inferred)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đọc file tài liệu'
      toast.error(msg)
    } finally {
      setUploadingSource(false)
      // reset file input
      e.target.value = ''
    }
  }

  const handleRemoveSource = (idx: number) => {
    setSources((prev) => prev.filter((_, i) => i !== idx))
  }

  // 2. Audio Overview Player (Web Speech API)
  const handleToggleAudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Trình duyệt của bạn chưa hỗ trợ Web Speech Audio.')
      return
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel()
      setIsPlayingAudio(false)
      return
    }

    const script = proposal?.study_guide?.audio_overview_script
    if (!script) {
      toast.error('Chưa có kịch bản âm thanh.')
      return
    }

    const cleanText = script.replace(/Host [AB]:/g, '').trim()
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'vi-VN'
    utterance.rate = 1.05

    const voices = window.speechSynthesis.getVoices()
    const viVoice = voices.find((v) => v.lang.includes('vi') || v.lang.includes('VIE'))
    if (viVoice) {
      utterance.voice = viVoice
    }

    utterance.onend = () => setIsPlayingAudio(false)
    utterance.onerror = () => setIsPlayingAudio(false)

    setIsPlayingAudio(true)
    window.speechSynthesis.speak(utterance)
    toast.info('🎙️ Đang phát bản tóm tắt âm thanh NotebookLM...')
  }

  // 3. Phân tích & Tạo đề xuất bằng NotebookLM Studio
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
        sources: sources.length > 0 ? sources : undefined,
        quadrant: 1,
      })
      setProposal(res)
      setEditableTasks(res.tasks)
      setStudioSubTab('schedule')
      toast.success('✨ NotebookLM Studio đã phân tích và lập hồ sơ nghiên cứu thành công!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lập kế hoạch lúc này'
      toast.error(msg)
    } finally {
      setAnalyzing(false)
    }
  }

  // 4. Hỏi đáp với tài liệu nguồn (Q&A with Sources)
  const handleAskQuestion = async () => {
    const q = questionText.trim()
    if (!q) return

    try {
      setAskingQuestion(true)
      const res = await focusService.askSources({
        subject: title || 'Môn học',
        question: q,
        sources,
      })
      setQaList((prev) => [
        ...prev,
        {
          q,
          a: res.answer,
          citations: res.citations,
          suggested_followups: res.suggested_followups,
        },
      ])
      setQuestionText('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể hỏi đáp lúc này'
      toast.error(msg)
    } finally {
      setAskingQuestion(false)
    }
  }

  // 5. Người dùng phê duyệt -> Lưu vào database
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
      handleModalClose()
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

  // 6. Hoàn tác một batch đã tạo
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

  // 7. Bóc tách văn bản thô dán từ website/tài liệu
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

  // 8. Upload File CSV / JSON
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
            date: String(item.date || item.deadline || todayYmd).slice(0, 10),
            quadrant: 1,
            notes: item.notes ? String(item.notes) : undefined,
            duration_minutes: Number(item.duration_minutes || 60),
          }))
          setImportedTasks(normalized)
          toast.success(`📁 Đã nạp ${normalized.length} mục từ file JSON!`)
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n').filter((l) => l.trim())
          const normalized: AIBreakdownTaskItem[] = []
          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',')
            if (parts.length >= 2) {
              const t = parts[0].trim().replace(/^"|"$/g, '')
              const d = parts[1].trim().replace(/^"|"$/g, '')
              const n = parts[3] ? parts[3].trim().replace(/^"|"$/g, '') : ''
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
      } catch {
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
      handleModalClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể import lúc này'
      toast.error(msg)
    } finally {
      setSubmittingImport(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-2 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/25 to-purple-500/25 rounded-xl border border-indigo-500/40 text-indigo-400 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate flex items-center gap-2">
                NotebookLM Studio • Phân Rã & Lên Lịch Ô 1
              </h2>
              <p className="text-xs text-slate-400">
                Neo nguồn tài liệu thực tế • Study Guide & Podcast Audio • Duyệt mới lưu • Hoàn tác 1-click
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
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
            <span>✨ NotebookLM Studio</span>
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
          {/* TAB 1: NOTEBOOKLM STUDIO */}
          {activeTab === 'breakdown' && (
            <div className="space-y-4">
              {/* Form Input + Sources Shelf */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Mục Tiêu & Nguồn Tài Liệu (Sources)
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

                {/* NotebookLM Sources Upload Shelf */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <FileUp className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-bold text-slate-200">
                        Nguồn Tài Liệu (PDF Slide, Word Đề Cương, TXT):
                      </span>
                    </div>

                    <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-sm transition-all">
                      {uploadingSource ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Đang bóc tách...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>+ Tải Lên Nguồn Mới</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        disabled={uploadingSource}
                        onChange={handleUploadSourceFile}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {sources.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                      💡 Mẹo: Tải lên slide bài giảng PDF hoặc đề cương Word để NotebookLM phân tích sát 100% nội dung thực tế môn học.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {sources.map((src, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-500/40 text-xs text-indigo-200"
                        >
                          <span className="font-bold text-[10px] uppercase px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                            {src.source_type || 'file'}
                          </span>
                          <span className="truncate max-w-[180px] font-medium">{src.name}</span>
                          <span className="text-[10px] text-slate-400">({src.words_count || 0} từ)</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSource(idx)}
                            className="text-slate-400 hover:text-rose-400 cursor-pointer ml-1"
                            title="Xóa nguồn này"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Ghi chú bổ sung / Dán nội dung các chương:
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
                    <span>Nhiệm vụ phân rã sẽ được neo nguồn và xếp vào <b>Ô 1 (Làm ngay)</b> trên lịch.</span>
                  </div>

                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={handlePreviewBreakdown}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>NotebookLM đang phân tích...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Phân Tích Bằng NotebookLM Studio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Proposal & NotebookLM Studio Hub */}
              {proposal && (
                <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/95 p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
                  {/* Studio Navigation Pills */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setStudioSubTab('schedule')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                          studioSubTab === 'schedule'
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Lộ Trình Ô 1 ({editableTasks.length} ngày)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStudioSubTab('audio')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                          studioSubTab === 'audio'
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <Headphones className="w-3.5 h-3.5" />
                        <span>🎙️ Podcast Audio Overview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStudioSubTab('studyguide')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                          studioSubTab === 'studyguide'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>📑 Study Guide & Khái Niệm</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStudioSubTab('qa')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                          studioSubTab === 'qa'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>💬 Hỏi Đáp Tài Liệu</span>
                      </button>
                    </div>

                    {proposal.sources_summary && (
                      <span className="text-[11px] text-indigo-300 font-medium hidden md:inline truncate max-w-[240px]">
                        {proposal.sources_summary}
                      </span>
                    )}
                  </div>

                  {/* SUBTAB 1: LỘ TRÌNH Ô 1 ĐÃ NEO NGUỒN */}
                  {studioSubTab === 'schedule' && (
                    <div className="space-y-3">
                      {/* AI Explanation Banner */}
                      <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-start gap-3">
                        <span className="text-xl shrink-0">💡</span>
                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-bold text-indigo-300">
                            Giải Trình Chiến Lược Ôn Thi:
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {proposal.explanation}
                          </p>
                        </div>
                      </div>

                      {/* Task List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                          <span className="font-bold text-slate-300">
                            Danh sách nhiệm vụ theo ngày (Có thể chỉnh sửa tiêu đề hoặc xóa bớt):
                          </span>
                          <span>Tổng: <b>{editableTasks.length} nhiệm vụ Ô 1</b></span>
                        </div>

                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                          {editableTasks.map((task, idx) => {
                            const parsedDate = parseSafeDate(task.date)
                            const formatted = parsedDate ? formatSafeDate(parsedDate, 'dd/MM') : task.date

                            return (
                              <div
                                key={idx}
                                className="rounded-xl border border-slate-700/80 bg-slate-800/80 p-2.5 sm:p-3 space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
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
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                                      Ô 1
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTaskFromProposal(idx)}
                                      className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                                      title="Xóa nhiệm vụ này"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Source Reference & Key Question badges */}
                                {(task.source_reference || task.key_question) && (
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pl-1 border-t border-slate-700/50 pt-1">
                                    {task.source_reference && (
                                      <span className="inline-flex items-center gap-1 text-indigo-300">
                                        📌 {task.source_reference}
                                      </span>
                                    )}
                                    {task.key_question && (
                                      <span className="inline-flex items-center gap-1 text-amber-300 truncate max-w-[320px]">
                                        ❓ {task.key_question}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 2: PODCAST AUDIO OVERVIEW */}
                  {studioSubTab === 'audio' && (
                    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900 to-indigo-950/40 p-4 space-y-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/35 text-amber-400 shrink-0">
                            <Headphones className="w-6 h-6 animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              Bản Tin Audio Overview (NotebookLM Podcast)
                              {isPlayingAudio && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                                  <Volume2 className="w-3 h-3" /> Đang phát
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-slate-300 mt-0.5">
                              Host A & Host B đàm thoại sâu, tóm lược những mẹo thi và kiến thức cốt lõi.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleToggleAudio}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer ${
                            isPlayingAudio
                              ? 'bg-rose-500 hover:bg-rose-600 text-white'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          }`}
                        >
                          {isPlayingAudio ? (
                            <>
                              <Pause className="w-4 h-4 fill-current" />
                              <span>Tạm Dừng Audio</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 fill-current" />
                              <span>Phát Podcast Tóm Tắt</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Script Reader */}
                      {proposal.study_guide?.audio_overview_script ? (
                        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar font-mono">
                          {proposal.study_guide.audio_overview_script.split('\n').map((line, lIdx) => (
                            <p
                              key={lIdx}
                              className={
                                line.startsWith('Host A:')
                                  ? 'text-sky-300'
                                  : line.startsWith('Host B:')
                                  ? 'text-amber-300'
                                  : 'text-slate-300'
                              }
                            >
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Chưa có kịch bản âm thanh.</p>
                      )}
                    </div>
                  )}

                  {/* SUBTAB 3: STUDY GUIDE & CORE CONCEPTS */}
                  {studioSubTab === 'studyguide' && (
                    <div className="space-y-3.5">
                      {/* Briefing summary */}
                      {proposal.study_guide?.briefing_summary && (
                        <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-1">
                          <h4 className="text-xs sm:text-sm font-bold text-purple-300 flex items-center gap-1.5">
                            <Lightbulb className="w-4 h-4 text-purple-400" />
                            Bản Tin Định Hướng Chiến Lược (Briefing Doc):
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {proposal.study_guide.briefing_summary}
                          </p>
                          {proposal.study_guide.difficulty_assessment && (
                            <p className="text-[11px] text-amber-300 pt-1 font-medium">
                              ⚠️ {proposal.study_guide.difficulty_assessment}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Core Concepts Grid */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                          Khái Niệm Cốt Lõi Từ Tài Liệu (Core Concepts):
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                          {proposal.study_guide?.core_concepts?.map((c, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1 text-xs"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-sky-300">{c.concept}</span>
                                {c.source && (
                                  <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-700/60">
                                    {c.source}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-300 text-[11px] leading-relaxed">
                                {c.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Potential Exam Questions */}
                      {proposal.study_guide?.exam_questions && (
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                          <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5" />
                            Câu Hỏi Thi Trọng Tâm & Tự Kiểm Tra:
                          </h5>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            {proposal.study_guide.exam_questions.map((q, qIdx) => (
                              <li key={qIdx} className="flex items-start gap-2">
                                <span className="text-amber-400 font-bold shrink-0">#{qIdx + 1}</span>
                                <span>{q}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBTAB 4: Q&A WITH SOURCES */}
                  {studioSubTab === 'qa' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                        <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Hỏi Đáp Trực Tiếp Với Tài Liệu Đã Nạp
                        </h4>
                        <p className="text-xs text-slate-400">
                          AI sẽ chỉ trả lời dựa trên các file bài giảng, đề cương bạn đã nạp vào Studio.
                        </p>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAskQuestion()
                            }}
                            placeholder="VD: Chương nào khó nhất? Có những công thức tính toán nào?..."
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                          />
                          <button
                            type="button"
                            disabled={askingQuestion || !questionText.trim()}
                            onClick={handleAskQuestion}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {askingQuestion ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">Gửi câu hỏi</span>
                          </button>
                        </div>
                      </div>

                      {/* Q&A Stream */}
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                        {qaList.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-500 italic">
                            Chưa có câu hỏi nào. Hãy thử hỏi về một nội dung bạn còn băn khoăn!
                          </div>
                        ) : (
                          qaList.map((qa, qaIdx) => (
                            <div
                              key={qaIdx}
                              className="rounded-xl border border-slate-800 bg-slate-800/60 p-3 space-y-1.5 text-xs"
                            >
                              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                                <span>❓ {qa.q}</span>
                              </div>
                              <p className="text-slate-200 leading-relaxed">{qa.a}</p>
                              {qa.citations && qa.citations.length > 0 && (
                                <p className="text-[10px] text-slate-400 pt-0.5">
                                  Trích dẫn: {qa.citations.join(', ')}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Confirmation Gate Footer */}
                  <div className="p-3.5 rounded-xl bg-slate-800/90 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-300 space-y-0.5">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        🛡️ Dữ liệu cũ của bạn được giữ nguyên 100%!
                      </span>
                      <p className="text-slate-400">
                        Chỉ khi bấm Đồng ý, hệ thống mới chính thức lưu {editableTasks.length} nhiệm vụ này vào Ô 1 trên lịch.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                            window.speechSynthesis.cancel()
                          }
                          setIsPlayingAudio(false)
                          setProposal(null)
                        }}
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
                            <Loader2 className="w-4 h-4 animate-spin" />
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
                ) : !historyLogs || historyLogs.length === 0 ? (
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
