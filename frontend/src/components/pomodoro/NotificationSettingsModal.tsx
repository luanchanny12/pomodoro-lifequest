import React, { useState, useEffect } from 'react'
import {
  X,
  Bell,
  BellRing,
  Monitor,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Sparkles,
  Info,
  Power,
  Cloud,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Radio,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  notificationManager,
  NotificationConfig,
} from '@/utils/notificationManager'
import {
  notificationService,
  BackendNotificationSettings,
} from '@/services/notificationService'

interface NotificationSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'web' | 'windows' | 'telegram' | 'cloud'

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('web')
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [config, setConfig] = useState<NotificationConfig>(() =>
    notificationManager.loadConfig()
  )

  // Telegram & Cloud state
  const [telegramToken, setTelegramToken] = useState<string>('')
  const [telegramChatId, setTelegramChatId] = useState<string>('')
  const [appPublicUrl, setAppPublicUrl] = useState<string>('')
  const [isTestingTelegram, setIsTestingTelegram] = useState<boolean>(false)
  const [isTestingWindows, setIsTestingWindows] = useState<boolean>(false)
  const [isTriggeringCloud, setIsTriggeringCloud] = useState<boolean>(false)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setPermission(notificationManager.getPermission())
      // Load backend settings
      notificationService
        .getSettings()
        .then((s) => {
          if (s.telegram_bot_token) setTelegramToken(s.telegram_bot_token)
          if (s.telegram_chat_id) setTelegramChatId(s.telegram_chat_id)
          if (s.app_public_url) setAppPublicUrl(s.app_public_url)
        })
        .catch(() => {})
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    toast.success(`Đã sao chép: ${label}`)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const handleRequestPermission = async () => {
    const perm = await notificationManager.requestPermission()
    setPermission(perm)
    if (perm === 'granted') {
      toast.success('Đã cấp quyền thông báo hệ thống thành công! 🎉')
      notificationManager.sendNotification('✨ Quyền thông báo đã sẵn sàng!', {
        body: 'Từ bây giờ, hệ thống sẽ nhắc nhở bạn đúng giờ ngay cả khi thu nhỏ trình duyệt!',
      })
    } else {
      toast.error('Trình duyệt chưa cho phép quyền thông báo. Vui lòng kiểm tra biểu tượng ổ khóa cạnh URL.')
    }
  }

  const handleTestWebNotification = () => {
    if (permission !== 'granted') {
      toast.error('Vui lòng cấp quyền thông báo trước!')
      return
    }
    notificationManager.sendNotification('🔔 Pomodoro Focus Hub: Thông Báo Thử Nghiệm', {
      body: 'Chúc mừng! Bạn đã nhận được thông báo trình duyệt thành công!',
    })
    toast.success('Đã bắn thông báo trình duyệt!')
  }

  const handleTestWindowsNotification = async () => {
    setIsTestingWindows(true)
    try {
      const res = await notificationService.testWindowsNotification()
      if (res.success) {
        toast.success(res.message || 'Đã gửi thông báo Windows Action Center thành công!')
      } else {
        toast.info(res.message)
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi thông báo Windows')
    } finally {
      setIsTestingWindows(false)
    }
  }

  const handleTestTelegram = async () => {
    if (!telegramToken.trim() || !telegramChatId.trim()) {
      toast.error('Vui lòng nhập Bot Token và Chat ID!')
      return
    }
    setIsTestingTelegram(true)
    try {
      await notificationService.testTelegramNotification(
        telegramToken.trim(),
        telegramChatId.trim(),
        `🔔 Pomodoro Focus Hub: Kết nối thành công!\n\nLink app: ${appPublicUrl.trim() || 'https://pomodoro-lifequest.vercel.app'}\n\nBạn sẽ nhận được thông báo 08:00 sáng và 21:30 tối hàng ngày dù tắt máy tính!`
      )
      // Save to backend
      await notificationService.updateSettings({
        telegram_bot_token: telegramToken.trim(),
        telegram_chat_id: telegramChatId.trim(),
        telegram_enabled: true,
        app_public_url: appPublicUrl.trim() || undefined,
      })
      toast.success('Đã gửi tin nhắn đến Telegram trên điện thoại của bạn! 📱')
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối Telegram')
    } finally {
      setIsTestingTelegram(false)
    }
  }

  const handleTriggerCloudScheduler = async () => {
    setIsTriggeringCloud(true)
    try {
      const res = await notificationService.triggerCloudTelegramCheck(true)
      if (res.sent_any) {
        toast.success('Đã kích hoạt gửi tin nhắn Telegram thành công! Hãy kiểm tra điện thoại 📱')
      } else {
        toast.info(res.details?.[0] || 'Scheduler đã chạy kiểm tra!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kích hoạt scheduler')
    } finally {
      setIsTriggeringCloud(false)
    }
  }

  const handleSaveConfig = (newConfig: Partial<NotificationConfig>) => {
    const updated = { ...config, ...newConfig }
    setConfig(updated)
    notificationManager.saveConfig(updated)
    toast.success('Đã lưu cấu hình thông báo')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#141720] border border-white/20 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Cài Đặt Thông Báo & Trợ Lý Nhắc Nhở 24/7
              </h3>
              <p className="text-xs text-white/60">
                Nhắc nhở học tập thường xuyên • Kể cả khi tắt máy tính hoặc đi ra ngoài
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-black/30 px-6 gap-2 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('web')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'web'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Trình Duyệt & Web</span>
          </button>

          <button
            onClick={() => setActiveTab('windows')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'windows'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Windows Native (Tắt web)</span>
          </button>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'telegram'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Telegram Bot (Điện Thoại)</span>
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'cloud'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>☁️ Đưa Lên Cloud 24/7</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* ── TAB 1: WEB NOTIFICATIONS ── */}
          {activeTab === 'web' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      permission === 'granted'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {permission === 'granted' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">
                      {permission === 'granted'
                        ? 'Quyền thông báo: Đã Bật ✓'
                        : 'Quyền thông báo: Chưa Bật'}
                    </div>
                    <div className="text-[11px] text-white/60 mt-0.5">
                      {permission === 'granted'
                        ? 'Trình duyệt sẽ hiển thị thông báo ngay cả khi bạn thu nhỏ cửa sổ.'
                        : 'Cần cấp quyền để nhận chuông báo Pomodoro và nhắc nhở học tập.'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {permission !== 'granted' ? (
                    <button
                      onClick={handleRequestPermission}
                      className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:opacity-95 text-black font-extrabold rounded-xl transition shadow-md active:scale-95"
                    >
                      Bật Thông Báo
                    </button>
                  ) : (
                    <button
                      onClick={handleTestWebNotification}
                      className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition flex items-center gap-1.5 active:scale-95"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Bắn thử thông báo</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider text-white/70">
                  Các Loại Thông Báo Tự Động
                </h4>

                <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">🍅 Khi hoàn thành phiên Pomodoro</div>
                    <div className="text-[11px] text-white/60">
                      Bắn thông báo chúc mừng và nhắc nhở nghỉ giải lao 5 phút.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.pomodoroEnd}
                    onChange={(e) => handleSaveConfig({ pomodoroEnd: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">☕ Khi hết giờ nghỉ ngơi</div>
                    <div className="text-[11px] text-white/60">
                      Bắn thông báo kêu gọi bắt đầu phiên học tập tiếp theo.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.breakEnd}
                    onChange={(e) => handleSaveConfig({ breakEnd: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">⏰ Nhắc nhở định kỳ khi chưa học</div>
                    <div className="text-[11px] text-white/60">
                      Nếu bạn mở máy tính mà lơ đễnh chưa vào phiên học, hệ thống sẽ nhắc nhẹ.
                    </div>
                  </div>
                  <select
                    value={config.inactivityMinutes}
                    onChange={(e) => handleSaveConfig({ inactivityMinutes: Number(e.target.value) })}
                    className="bg-black/50 border border-white/20 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none"
                  >
                    <option value={0}>Tắt</option>
                    <option value={30}>Mỗi 30 phút</option>
                    <option value={60}>Mỗi 1 tiếng</option>
                    <option value={120}>Mỗi 2 tiếng</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: WINDOWS NATIVE BACKGROUND (WHEN WEB IS CLOSED) ── */}
          {activeTab === 'windows' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-indigo-200 text-sm">
                    Thông Báo Windows Ngay Cả Khi KHÔNG MỞ WEB & KHÔNG MỞ APP
                  </div>
                  <p className="text-white/70 text-[11px] leading-relaxed">
                    Một tiến trình chạy ngầm siêu nhẹ (~10MB RAM) được đăng ký với Windows. Dù bạn tắt sạch trình duyệt, đến khung giờ vàng (8:00 sáng, 14:00 chiều, 21:30 tối), Windows Action Center vẫn tự động hiện thông báo ở góc màn hình!
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">Thử Nghiệm Thông Báo Windows Toast</div>
                  <div className="text-[11px] text-white/60">
                    Bắn thử một thông báo Windows gốc ngay bây giờ.
                  </div>
                </div>
                <button
                  onClick={handleTestWindowsNotification}
                  disabled={isTestingWindows}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTestingWindows ? 'Đang gửi...' : 'Bắn thử Toast'}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <Power className="w-4 h-4 text-emerald-400" />
                  <span>Cách Kích Hoạt Khởi Động Cùng Windows</span>
                </div>
                <p className="text-[11px] text-white/70">
                  Trong thư mục dự án đã tạo sẵn 2 file tiện ích:
                </p>
                <div className="space-y-2 text-[11px] font-mono bg-black/50 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <span className="font-bold">✓ Cài đặt:</span>
                    <span>Chạy file <code className="bg-white/10 px-1 py-0.5 rounded">install_windows_startup.bat</code></span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-300">
                    <span className="font-bold">✗ Gỡ bỏ:</span>
                    <span>Chạy file <code className="bg-white/10 px-1 py-0.5 rounded">uninstall_windows_startup.bat</code></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: TELEGRAM BOT (WHEN COMPUTER IS SHUT DOWN) ── */}
          {activeTab === 'telegram' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-cyan-200 text-sm">
                    Nhận Thông Báo Trên Điện Thoại (Kể Cả Khi Ra Ngoài / Tắt Máy Tính)
                  </div>
                  <p className="text-white/70 text-[11px] leading-relaxed">
                    Khi triển khai lên đám mây, server Cloud 24/7 sẽ tự động nhắn tin trực tiếp vào điện thoại bạn lúc 08:00 sáng và 21:30 tối. Bấm vào link trong tin nhắn là mở ngay app học tập!
                  </p>
                </div>
              </div>

              {/* Bot Credentials Form */}
              <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-white/10">
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Sparkles className="w-4 h-4 flex-shrink-0" />
                    <span>BƯỚC BẮT BUỘC ĐỂ NHẬN ĐƯỢC TIN NHẮN:</span>
                  </div>
                  <p className="leading-relaxed text-[11px] text-amber-100/90">
                    Telegram có chính sách bảo mật: Bot <b>không thể tự ý gửi tin</b> nếu bạn chưa bấm <b>START</b>.
                    Hãy bấm nút bên dưới để mở bot trên Telegram và nhấn <b>Bắt Đầu (START)</b> trước khi test nhé:
                  </p>
                  <div className="pt-1">
                    <a
                      href="https://t.me/luan_podomoro_focus_bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition shadow active:scale-95"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Mở Bot @luan_podomoro_focus_bot & Bấm START ↗</span>
                    </a>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/80">
                    Telegram Bot Token:
                  </label>
                  <input
                    type="password"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="Ví dụ: 123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                    className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/80">
                    Your Telegram Chat ID:
                  </label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="Ví dụ: 987654321"
                    className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/80">
                    Đường Link Web Công Khai (Vercel / Cloud URL để gắn vào tin nhắn):
                  </label>
                  <input
                    type="text"
                    value={appPublicUrl}
                    onChange={(e) => setAppPublicUrl(e.target.value)}
                    placeholder="Ví dụ: https://pomodoro-lifequest.vercel.app"
                    className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={handleTriggerCloudScheduler}
                    disabled={isTriggeringCloud}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition flex items-center gap-1.5 active:scale-95 text-xs disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isTriggeringCloud ? 'Đang kích hoạt...' : 'Kích Hoạt Gửi Ngay'}</span>
                  </button>

                  <button
                    onClick={handleTestTelegram}
                    disabled={isTestingTelegram}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition shadow flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTestingTelegram ? 'Đang gửi...' : 'Lưu & Bắn Thử Tin Nhắn 📱'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Guide */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="font-bold text-white text-xs flex items-center gap-1.5 text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Hướng dẫn tạo Bot miễn phí trong 1 phút:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-white/70">
                  <li>Mở Telegram, tìm kiếm <code className="text-cyan-300 font-bold">@BotFather</code> $\rightarrow$ gõ <code className="text-cyan-300">/newbot</code> $\rightarrow$ đặt tên bot $\rightarrow$ nhận <b>Bot Token</b>.</li>
                  <li>Tìm kiếm <code className="text-cyan-300 font-bold">@userinfobot</code> $\rightarrow$ bấm Start để lấy số <b>Id (Chat ID)</b> của bạn.</li>
                  <li>Chat <code className="text-cyan-300">/start</code> với con bot bạn vừa tạo, rồi dán 2 thông tin vào ô trên và bấm <i>Lưu & Bắn Thử Tin Nhắn</i>!</li>
                </ol>
              </div>
            </div>
          )}

          {/* ── TAB 4: CLOUD DEPLOYMENT 24/7 & CALENDAR (.ICS) ── */}
          {activeTab === 'cloud' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <Cloud className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-emerald-200 text-sm">
                    Triển Khai Đám Mây 24/7 (Miễn Phí Vĩnh Viễn Với Vercel & Render)
                  </div>
                  <p className="text-white/70 text-[11px] leading-relaxed">
                    Sau khi đưa lên Cloud, ứng dụng và trợ lý Telegram sẽ tự động hoạt động 24/7/365. Dù máy tính ở nhà rút điện, bạn vẫn nhận thông báo và truy cập ứng dụng mượt mà từ bất kỳ đâu trên thế giới!
                  </p>
                </div>
              </div>

              {/* Step by Step Guide */}
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">1</span>
                      <span>Đóng Gói & Đưa Mã Nguồn Lên GitHub</span>
                    </div>
                    <button
                      onClick={() => handleCopy('.\\setup_git_and_cloud.bat', 'Lệnh khởi chạy')}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] text-white/80 flex items-center gap-1 transition"
                    >
                      {copiedText === 'Lệnh khởi chạy' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy lệnh</span>
                    </button>
                  </div>
                  <p className="text-white/60 text-[11px]">
                    Chạy file tiện ích đã tạo sẵn trong thư mục dự án: <code className="bg-black/60 px-1.5 py-0.5 rounded text-emerald-300">setup_git_and_cloud.bat</code>. File này sẽ tự động khởi tạo git và chuẩn bị sẵn sàng để đẩy lên GitHub.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">2</span>
                      <span>Deploy Backend Lên Render.com (24/7 Miễn Phí)</span>
                    </div>
                    <a
                      href="https://dashboard.render.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>render.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-[11px] text-white/70 space-y-1 font-mono bg-black/60 p-3 rounded-xl border border-white/5">
                    <div>• Root Directory: <span className="text-cyan-300">backend</span></div>
                    <div>• Build Command: <span className="text-cyan-300">pip install -r requirements.txt</span></div>
                    <div>• Start Command: <span className="text-cyan-300">uvicorn app.main:app --host 0.0.0.0 --port $PORT</span></div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">3</span>
                      <span>Deploy Frontend Lên Vercel.com (Tốc Độ Cao Miễn Phí)</span>
                    </div>
                    <a
                      href="https://vercel.com/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>vercel.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-[11px] text-white/70 space-y-1 font-mono bg-black/60 p-3 rounded-xl border border-white/5">
                    <div>• Root Directory: <span className="text-purple-300">frontend</span></div>
                    <div>• Environment Variable: <span className="text-purple-300">VITE_API_URL = URL backend Render</span></div>
                  </div>
                </div>

                {/* Keep-Alive Tip */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="font-bold text-amber-300 text-xs flex items-center gap-2">
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>Mẹo Giữ Render Thức 24/7/365 Không Bao Giờ Ngủ:</span>
                  </div>
                  <p className="text-[11px] text-white/80 leading-relaxed">
                    Vào trang web miễn phí <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" className="text-amber-300 underline font-bold">cron-job.org</a> hoặc <a href="https://uptimerobot.com" target="_blank" rel="noopener noreferrer" className="text-amber-300 underline font-bold">uptimerobot.com</a>, tạo 1 lịch ping định kỳ 10 phút/lần tới URL:
                  </p>
                  <div className="flex items-center justify-between bg-black/60 p-2.5 rounded-xl border border-white/10 font-mono text-[10px] text-amber-200">
                    <span className="truncate">https://[backend-render-cua-ban].onrender.com/api/notifications/telegram-trigger-check</span>
                    <button
                      onClick={() => handleCopy('https://[backend-cua-ban].onrender.com/api/notifications/telegram-trigger-check', 'URL Ping')}
                      className="ml-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[9px] text-white flex items-center gap-1 flex-shrink-0"
                    >
                      {copiedText === 'URL Ping' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* Smart Phone Calendar (.ics) Offline Backup */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-bold text-white text-xs flex items-center gap-1.5 text-cyan-300">
                      <Calendar className="w-4 h-4" />
                      <span>Tính Năng Dự Phòng: Đồng Bộ Lịch Điện Thoại (.ICS)</span>
                    </div>
                    <p className="text-[11px] text-white/60">
                      Tải file lịch thông minh vào Apple Calendar (iPhone) hoặc Google Calendar (Android) để điện thoại đổ chuông báo thức offline 08:00 & 21:30 kể cả khi không có 4G.
                    </p>
                  </div>
                  <a
                    href="/api/calendar/pomodoro-reminders.ics"
                    download="pomodoro-reminders.ics"
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition shadow flex items-center gap-1.5 active:scale-95 text-xs whitespace-nowrap self-start sm:self-auto"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Tải File .ICS</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
