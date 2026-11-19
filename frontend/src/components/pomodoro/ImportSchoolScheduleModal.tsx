import React, { useState, useEffect } from 'react'
import {
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Upload,
  User,
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  focusService,
  type SchoolScheduleItem,
  type PhenikaaSyncStatus,
} from '@/services/focusService'

interface Props {
  isOpen: boolean
  onClose: () => void
  schedules: SchoolScheduleItem[]
  onRefresh: () => void
}

const PHENIKAA_SAMPLE_SCHEDULE: Partial<SchoolScheduleItem>[] = [
  {
    course_name: 'Lập trình phân tích dữ liệu với python (Lý thuyết)',
    course_code: 'CSE702031',
    day_of_week: 2, // Thứ 2
    start_time: '15:35',
    end_time: '18:15',
    room: 'A4-203',
    lecturer: 'Thầy Bùi Anh Tuấn',
    semester: 'Học kỳ 2 (2026-2027)',
  },
  {
    course_name: 'Lập trình phân tích dữ liệu với python (Thực hành)',
    course_code: 'CSE702031',
    day_of_week: 4, // Thứ 4
    start_time: '09:50',
    end_time: '12:30',
    room: 'A6-201.202 (PC)',
    lecturer: 'Thầy Bùi Anh Tuấn',
    semester: 'Học kỳ 2 (2026-2027)',
  },
  {
    course_name: 'Trực quan hoá dữ liệu (Lý thuyết)',
    course_code: 'CSE702060',
    day_of_week: 4, // Thứ 4
    start_time: '15:35',
    end_time: '18:15',
    room: 'A8-201',
    lecturer: 'Thầy Đào Thiện Thành',
    semester: 'Học kỳ 2 (2026-2027)',
  },
  {
    course_name: 'Quản trị dự án công nghệ thông tin (Lý thuyết)',
    course_code: 'CSE702049',
    day_of_week: 5, // Thứ 5
    start_time: '07:00',
    end_time: '09:40',
    room: 'A4-502 (TH)',
    lecturer: 'Thầy Nguyễn Văn Hùng',
    semester: 'Học kỳ 2 (2026-2027)',
  },
  {
    course_name: 'Quản trị dự án CNTT (E-learning)',
    course_code: 'CSE702049',
    day_of_week: 5, // Thứ 5
    start_time: '18:00',
    end_time: '20:30',
    room: 'ONLINE-Elearning',
    lecturer: 'Coursera / Elearning',
    semester: 'Học kỳ 2 (2026-2027)',
  },
  {
    course_name: 'Phân tích nghiệp vụ kinh doanh (Lý thuyết)',
    course_code: 'CSE702046',
    day_of_week: 6, // Thứ 6
    start_time: '12:45',
    end_time: '15:25',
    room: 'A2-609.610',
    lecturer: 'Thầy Nguyễn Hoàng Anh',
    semester: 'Học kỳ 2 (2026-2027)',
  },
  {
    course_name: 'Trực quan hoá dữ liệu (Thực hành)',
    course_code: 'CSE702060',
    day_of_week: 6, // Thứ 6
    start_time: '15:35',
    end_time: '18:15',
    room: 'A6-305 (PC)',
    lecturer: 'Thầy Đào Thiện Thành',
    semester: 'Học kỳ 2 (2026-2027)',
  },
]

export const ImportSchoolScheduleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  schedules,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'manual' | 'paste'>('list')

  // Form thêm môn học thủ công
  const [schoolNameInput, setSchoolNameInput] = useState('Trường Đại Học')
  const [courseName, setCourseName] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState<number>(2)
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime] = useState('09:15')
  const [room, setRoom] = useState('')
  const [lecturer, setLecturer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form paste từ web
  const [pasteText, setPasteText] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  // Phenikaa 2-Tuần Auto-Sync state
  const [syncStatus, setSyncStatus] = useState<PhenikaaSyncStatus | null>(null)
  const [isSyncingNow, setIsSyncingNow] = useState(false)
  const [isTogglingAutoSync, setIsTogglingAutoSync] = useState(false)

  const loadSyncStatus = async () => {
    try {
      const res = await focusService.getPhenikaaSyncStatus()
      setSyncStatus(res)
    } catch (err) {
      console.warn('Lỗi tải trạng thái đồng bộ Phenikaa:', err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadSyncStatus()
      if (schedules.length > 0 && schedules[0].school_name) {
        setSchoolNameInput(schedules[0].school_name)
      }
    }
  }, [isOpen, schedules])

  const handleManualSyncNow = async () => {
    setIsSyncingNow(true)
    try {
      const res = await focusService.triggerPhenikaaSync()
      if (res.success) {
        toast.success(res.message || 'Đồng bộ lịch Phenikaa thành công!')
      } else {
        toast.info(res.message)
      }
      await loadSyncStatus()
      onRefresh()
    } catch {
      toast.error('Lỗi khi kích hoạt đồng bộ!')
    } finally {
      setIsSyncingNow(false)
    }
  }

  const handleToggleAutoSync = async () => {
    if (!syncStatus) return
    setIsTogglingAutoSync(true)
    const newEnabled = !syncStatus.auto_sync_enabled
    try {
      const updated = await focusService.updatePhenikaaSyncConfig({
        auto_sync_enabled: newEnabled,
        sync_interval_days: 14,
      })
      setSyncStatus(updated)
      toast.success(
        newEnabled
          ? 'Đã BẬT tự động đồng bộ lịch Phenikaa định kỳ 2 tuần (14 ngày)!'
          : 'Đã TẮT tự động đồng bộ định kỳ.'
      )
    } catch {
      toast.error('Không thể cập nhật cấu hình đồng bộ.')
    } finally {
      setIsTogglingAutoSync(false)
    }
  }

  if (!isOpen) return null

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseName.trim()) {
      toast.error('Vui lòng nhập tên môn học!')
      return
    }
    setIsSubmitting(true)
    try {
      await focusService.addSchoolScheduleItem({
        course_name: courseName.trim(),
        school_name: schoolNameInput.trim() || undefined,
        course_code: courseCode.trim() || undefined,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        room: room.trim() || undefined,
        lecturer: lecturer.trim() || undefined,
        semester: 'Học kỳ 1 (2026-2027)',
      })
      toast.success(`Đã thêm môn "${courseName}" vào thời khóa biểu!`)
      setCourseName('')
      setCourseCode('')
      setRoom('')
      setLecturer('')
      setActiveTab('list')
      onRefresh()
    } catch {
      toast.error('Không thể thêm môn học. Vui lòng thử lại!')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = async (id: number, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa môn "${name}" khỏi thời khóa biểu?`)) return
    try {
      await focusService.deleteSchoolScheduleItem(id)
      toast.success(`Đã xóa môn "${name}"!`)
      onRefresh()
    } catch {
      toast.error('Lỗi khi xóa môn học.')
    }
  }

  const handleImportSampleData = async () => {
    setIsImporting(true)
    try {
      await focusService.batchImportSchoolSchedule(PHENIKAA_SAMPLE_SCHEDULE)
      toast.success('Đã import thời khóa biểu chuẩn trường Phenikaa thành công!')
      onRefresh()
      setActiveTab('list')
    } catch {
      toast.error('Lỗi khi nạp dữ liệu mẫu!')
    } finally {
      setIsImporting(false)
    }
  }

  const handleParseAndImportPaste = async () => {
    if (!pasteText.trim()) {
      toast.error('Vui lòng dán nội dung thời khóa biểu!')
      return
    }
    setIsImporting(true)
    try {
      const lines = pasteText.split('\n').map((l) => l.trim()).filter(Boolean)
      const parsedItems: Partial<SchoolScheduleItem>[] = []

      for (const line of lines) {
        let dow = 2
        if (/thứ\s*3/i.test(line) || /t3/i.test(line)) dow = 3
        else if (/thứ\s*4/i.test(line) || /t4/i.test(line)) dow = 4
        else if (/thứ\s*5/i.test(line) || /t5/i.test(line)) dow = 5
        else if (/thứ\s*6/i.test(line) || /t6/i.test(line)) dow = 6
        else if (/thứ\s*7/i.test(line) || /t7/i.test(line)) dow = 7
        else if (/chủ\s*nhật|cn/i.test(line)) dow = 8

        const timeMatch = line.match(/(\d{1,2}:\d{2})\s*(?:-|đến)\s*(\d{1,2}:\d{2})/)
        const start = timeMatch ? timeMatch[1] : '07:00'
        const end = timeMatch ? timeMatch[2] : '09:15'

        const roomMatch = line.match(/([A-Z]\d+[-_]\d+)/i)
        const parsedRoom = roomMatch ? roomMatch[1].toUpperCase() : 'Giảng đường'

        const cleanName = line
          .replace(/thứ\s*\d|chủ\s*nhật/gi, '')
          .replace(/\d{1,2}:\d{2}\s*(?:-|đến)\s*\d{1,2}:\d{2}/g, '')
          .replace(/[A-Z]\d+[-_]\d+/gi, '')
          .replace(/[,\-|]/g, ' ')
          .trim()

        if (cleanName.length > 3) {
          parsedItems.push({
            course_name: cleanName.slice(0, 80),
            school_name: schoolNameInput.trim() || undefined,
            day_of_week: dow,
            start_time: start,
            end_time: end,
            room: parsedRoom,
            semester: 'Học kỳ 1 (2026-2027)',
          })
        }
      }

      if (parsedItems.length === 0) {
        parsedItems.push({
          course_name: pasteText.slice(0, 100),
          school_name: schoolNameInput.trim() || undefined,
          day_of_week: 2,
          start_time: '07:00',
          end_time: '09:15',
          room: 'A7-302',
          semester: 'Học kỳ 1 (2026-2027)',
        })
      }

      await focusService.batchImportSchoolSchedule(parsedItems)
      toast.success(`Đã nhận diện và thêm ${parsedItems.length} môn học vào lịch!`)
      setPasteText('')
      onRefresh()
      setActiveTab('list')
    } catch {
      toast.error('Lỗi khi phân tích thời khóa biểu!')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {schedules[0]?.school_name
                  ? `Thời Khóa Biểu: ${schedules[0].school_name}`
                  : 'Thời Khóa Biểu Học Tập / Giảng Đường'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động đồng bộ vào Lịch Tháng để cân đối giữa giờ học và kế hoạch cá nhân
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Tự Động Đồng Bộ 2 Tuần / Lần */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-sky-50/90 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900 border-b border-blue-100 dark:border-blue-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      syncStatus?.auto_sync_enabled ? 'bg-emerald-400' : 'bg-slate-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      syncStatus?.auto_sync_enabled ? 'bg-emerald-500' : 'bg-slate-500'
                    }`}
                  />
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${
                      isSyncingNow ? 'animate-spin' : ''
                    }`}
                  />
                  Tự động đồng bộ 2 tuần / lần (Cổng Đào Tạo Phenikaa)
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    syncStatus?.auto_sync_enabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {syncStatus?.auto_sync_enabled
                    ? `Đang BẬT (${syncStatus.sync_interval_days} ngày/lần)`
                    : 'Đã tắt'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {syncStatus?.next_sync_date ? (
                  <span>
                    Lần quét kế tiếp: <strong className="text-blue-600 dark:text-blue-400">{syncStatus.next_sync_date}</strong> (sau {syncStatus.days_until_next_sync} ngày)
                    {syncStatus.last_changes_summary && (
                      <span className="ml-1 text-slate-500 dark:text-slate-400">
                        • {syncStatus.last_changes_summary}
                      </span>
                    )}
                  </span>
                ) : (
                  <span>Tính năng tùy chọn cho sinh viên Phenikaa: tự động quét thời khóa biểu và lịch thi qua bot</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleToggleAutoSync}
                disabled={isTogglingAutoSync}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 disabled:opacity-50"
                title="Bật/Tắt chế độ tự động đồng bộ định kỳ"
              >
                {syncStatus?.auto_sync_enabled ? 'Tắt tự động' : 'Bật 14 ngày'}
              </button>
              <button
                type="button"
                onClick={handleManualSyncNow}
                disabled={isSyncingNow}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                {isSyncingNow ? 'Đang quét...' : 'Đồng bộ ngay'}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/30 dark:bg-slate-800/20">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Danh sách môn học ({schedules.length})
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" /> Thêm môn mới
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'paste'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" /> Dán thời khóa biểu (Text)
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'list' && (
            <div className="space-y-3">
              {schedules.length === 0 ? (
                <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Chưa có môn học nào trong thời khóa biểu
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                    Bạn có thể thêm từng môn học hoặc import nhanh thời khóa biểu để
                    hệ thống tự sắp xếp lịch học cân đối với công việc.
                  </p>
                  <button
                    onClick={handleImportSampleData}
                    disabled={isImporting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isImporting ? 'Đang nạp...' : 'Nạp thời khóa biểu chuẩn Phenikaa'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-xs font-medium text-slate-500">
                      Hiển thị theo lịch trong tuần:
                    </span>
                    <button
                      onClick={handleImportSampleData}
                      disabled={isImporting}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Nạp thêm lịch mẫu
                    </button>
                  </div>
                  {schedules.map((sc) => (
                    <div
                      key={sc.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                            {sc.day_name}
                          </span>
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                            {sc.course_name}
                          </span>
                          {sc.course_code && (
                            <span className="text-xs text-slate-400">({sc.course_code})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-500" /> {sc.start_time} -{' '}
                            {sc.end_time}
                          </span>
                          {sc.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500" /> {sc.room}
                            </span>
                          )}
                          {sc.lecturer && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-purple-500" /> {sc.lecturer}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(sc.id, sc.course_name)}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Xóa môn này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleCreateManual} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên trường / Đơn vị đào tạo
                  </label>
                  <input
                    type="text"
                    value={schoolNameInput}
                    onChange={(e) => setSchoolNameInput(e.target.value)}
                    placeholder="Ví dụ: Đại học Phenikaa, Bách Khoa..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên môn học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="Ví dụ: Lập trình Web Nâng Cao"
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Thứ trong tuần
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={2}>Thứ 2</option>
                    <option value={3}>Thứ 3</option>
                    <option value={4}>Thứ 4</option>
                    <option value={5}>Thứ 5</option>
                    <option value={6}>Thứ 6</option>
                    <option value={7}>Thứ 7</option>
                    <option value={8}>Chủ Nhật</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã môn (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="CSE301"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giờ bắt đầu
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giờ kết thúc
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phòng học
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="A7-302"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giảng viên (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={lecturer}
                    onChange={(e) => setLecturer(e.target.value)}
                    placeholder="Thầy / Cô giảng dạy"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> {isSubmitting ? 'Đang lưu...' : 'Thêm Môn'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Truy cập cổng <b>qldtbeta.phenikaa-uni.edu.vn</b>, bôi đen copy toàn bộ bảng thời
                khóa biểu và dán vào ô dưới đây. Hệ thống sẽ tự động bóc tách tên môn, phòng học và
                giờ học:
              </p>
              <textarea
                rows={6}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Ví dụ dán vào:&#10;Thứ 2: Lập trình Web Nâng Cao 07:00 - 09:15 Phòng A7-302&#10;Thứ 4: Kiến Trúc Phần Mềm 07:00 - 09:15 Phòng A9-405"
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleImportSampleData}
                  disabled={isImporting}
                  className="px-3.5 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                >
                  Dùng dữ liệu mẫu Phenikaa
                </button>
                <button
                  type="button"
                  onClick={handleParseAndImportPaste}
                  disabled={isImporting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />{' '}
                  {isImporting ? 'Đang phân tích...' : 'Nhận diện & Import'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
