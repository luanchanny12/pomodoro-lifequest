import React, { useState, useEffect, lazy, Suspense } from 'react'
import {
  X,
  User,
  Lock,
  Sparkles,
  Rocket,
  Zap,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { authService, UserProfile } from '@/services/authService'

const RacerVehicle3DCanvas = lazy(() =>
  import('./RacerVehicle3DCanvas').then((m) => ({ default: m.RacerVehicle3DCanvas }))
)

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: UserProfile) => void
}

const RACER_AVATARS = [
  { id: 'rocket', name: 'Tàu Vũ Trụ', icon: '🚀', desc: 'Lướt nhanh vạn dặm', speed: '9.9/10', color: 'from-rose-500/20 to-orange-500/20' },
  { id: 'cyber_car', name: 'Siêu Xe Neon', icon: '🏎️', desc: 'Bứt tốc ngoạn mục', speed: '9.7/10', color: 'from-cyan-500/20 to-blue-500/20' },
  { id: 'quantum_saucer', name: 'Đĩa Bay Lượng Tử', icon: '🛸', desc: 'Dịch chuyển tức thời', speed: '9.8/10', color: 'from-purple-500/20 to-indigo-500/20' },
  { id: 'lightning', name: 'Tia Chớp', icon: '⚡', desc: 'Nhanh như sét đánh', speed: '10/10', color: 'from-amber-500/20 to-yellow-500/20' },
  { id: 'lightcycle', name: 'Mô Tô Ánh Sáng', icon: '🏍️', desc: 'Uốn lượn phong cách', speed: '9.5/10', color: 'from-pink-500/20 to-rose-500/20' },
]

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('cyber_car')
  const [loading, setLoading] = useState(false)

  // Toggle password visibility
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      setPassword('')
      setConfirmPassword('')
      setFieldErrors({})
      setShowPassword(false)
      setShowConfirmPassword(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const cleanUsername = username.trim().toLowerCase()
    const cleanDisplay = displayName.trim()

    // Validate Username
    if (!cleanUsername) {
      errors.username = 'Vui lòng nhập tên đăng nhập!'
    } else if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      errors.username = 'Tên đăng nhập từ 3–30 ký tự, chỉ gồm chữ không dấu, số và dấu gạch dưới (không khoảng trắng)!'
    }

    // Validate Display Name (only in register mode)
    if (mode === 'register') {
      if (!cleanDisplay) {
        errors.displayName = 'Vui lòng nhập tên hiển thị!'
      } else if (cleanDisplay.length < 2 || cleanDisplay.length > 50) {
        errors.displayName = 'Tên hiển thị phải có từ 2 đến 50 ký tự!'
      }
    }

    // Validate Password
    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu!'
    } else if (password.length < 6) {
      errors.password = 'Mật khẩu phải có tối thiểu 6 ký tự!'
    }

    // Validate Confirm Password (only in register mode)
    if (mode === 'register') {
      if (!confirmPassword) {
        errors.confirmPassword = 'Vui lòng nhập lại mật khẩu để xác nhận!'
      } else if (confirmPassword !== password) {
        errors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp!'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!validate()) {
      return
    }

    setLoading(true)
    try {
      if (mode === 'register') {
        const res = await authService.register(
          username.trim().toLowerCase(),
          displayName.trim(),
          password,
          selectedAvatar
        )
        toast.success(`Chào mừng ${res.user.display_name} tham gia đường đua! 🎉`)
        onSuccess(res.user)
        onClose()
      } else {
        const res = await authService.login(username.trim().toLowerCase(), password)
        toast.success(`Chào mừng ${res.user.display_name} trở lại! 🚀`)
        onSuccess(res.user)
        onClose()
      }
    } catch (err: any) {
      toast.error(err.message || 'Thao tác thất bại, vui lòng thử lại!')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setFieldErrors({})
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full ${
          mode === 'register' ? 'max-w-lg md:max-w-4xl' : 'max-w-md'
        } max-h-[92vh] bg-[#121622] border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col transition-all duration-300`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/60 via-indigo-950/40 to-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold">
              {mode === 'login' ? <Rocket className="w-5 h-5" /> : <Sparkles className="w-5 h-5 text-amber-300" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'login' ? 'Đăng Nhập Đường Đua' : 'Tạo Tài Khoản Tay Đua'}
              </h3>
              <p className="text-[11px] text-white/60">
                {mode === 'login'
                  ? 'Vào đua Pomodoro & cày mục tiêu cùng bạn bè'
                  : 'Chọn xe đua 3D và lập kỷ lục tập trung mới'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex border-b border-white/10 bg-black/40">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-3 text-xs font-bold transition border-b-2 ${
              mode === 'login'
                ? 'border-cyan-400 text-cyan-300 bg-white/5'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-3 text-xs font-bold transition border-b-2 ${
              mode === 'register'
                ? 'border-amber-400 text-amber-300 bg-white/5'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Đăng Ký Mới
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 text-xs overflow-y-auto max-h-[calc(92vh-135px)]">
          {mode === 'login' ? (
            /* ── CHẾ ĐỘ ĐĂNG NHẬP ── */
            <div className="space-y-4 max-w-sm mx-auto py-2">
              {/* Username */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/80">
                  Tên đăng nhập:
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))
                      if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: '' }))
                    }}
                    placeholder="Nhập tên đăng nhập"
                    className={`w-full pl-9 pr-3 py-2.5 bg-black/50 border rounded-xl text-white placeholder:text-white/30 focus:outline-none text-xs font-mono transition ${
                      fieldErrors.username ? 'border-rose-500 focus:border-rose-400' : 'border-white/20 focus:border-cyan-400'
                    }`}
                  />
                </div>
                {fieldErrors.username && (
                  <div className="flex items-center gap-1 text-[11px] text-rose-400 pt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.username}</span>
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/80">
                  Mật khẩu:
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }))
                    }}
                    placeholder="Nhập mật khẩu"
                    className={`w-full pl-9 pr-10 py-2.5 bg-black/50 border rounded-xl text-white placeholder:text-white/30 focus:outline-none text-xs transition ${
                      fieldErrors.password ? 'border-rose-500 focus:border-rose-400' : 'border-white/20 focus:border-cyan-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-white/40 hover:text-white transition"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <div className="flex items-center gap-1 text-[11px] text-rose-400 pt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </div>
                )}
              </div>

              {/* Submit Button Login */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 font-extrabold rounded-xl transition shadow-lg flex items-center justify-center gap-2 active:scale-95 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-95"
                >
                  <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* ── CHẾ ĐỘ ĐĂNG KÝ (SPLIT DESKTOP 2 CỘT: FORM & 3D GARAGE) ── */
            <div className="md:grid md:grid-cols-12 md:gap-6 items-start">
              {/* CỘT TRÁI: FORM ĐĂNG KÝ */}
              <div className="md:col-span-6 space-y-3">
                {/* Tên hiển thị */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/80">
                    Tên hiển thị:
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value)
                        if (fieldErrors.displayName) setFieldErrors((prev) => ({ ...prev, displayName: '' }))
                      }}
                      placeholder="Nhập tên hiển thị của bạn"
                      className={`w-full pl-9 pr-3 py-2 bg-black/50 border rounded-xl text-white placeholder:text-white/30 focus:outline-none text-xs transition ${
                        fieldErrors.displayName ? 'border-rose-500 focus:border-rose-400' : 'border-white/20 focus:border-amber-400'
                      }`}
                    />
                  </div>
                  {fieldErrors.displayName && (
                    <div className="flex items-center gap-1 text-[11px] text-rose-400 pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.displayName}</span>
                    </div>
                  )}
                </div>

                {/* Tên đăng nhập */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/80">
                    Tên đăng nhập:
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))
                        if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: '' }))
                      }}
                      placeholder="Viết liền, không dấu (ví dụ: taydua99)"
                      className={`w-full pl-9 pr-3 py-2 bg-black/50 border rounded-xl text-white placeholder:text-white/30 focus:outline-none text-xs font-mono transition ${
                        fieldErrors.username ? 'border-rose-500 focus:border-rose-400' : 'border-white/20 focus:border-cyan-400'
                      }`}
                    />
                  </div>
                  {fieldErrors.username && (
                    <div className="flex items-center gap-1 text-[11px] text-rose-400 pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.username}</span>
                    </div>
                  )}
                </div>

                {/* Mật khẩu */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/80">
                    Mật khẩu:
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }))
                      }}
                      placeholder="Tối thiểu 6 ký tự"
                      className={`w-full pl-9 pr-10 py-2 bg-black/50 border rounded-xl text-white placeholder:text-white/30 focus:outline-none text-xs transition ${
                        fieldErrors.password ? 'border-rose-500 focus:border-rose-400' : 'border-white/20 focus:border-cyan-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-white/40 hover:text-white transition"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <div className="flex items-center gap-1 text-[11px] text-rose-400 pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.password}</span>
                    </div>
                  )}
                </div>

                {/* Xác nhận mật khẩu */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/80">
                    Xác nhận mật khẩu:
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
                      }}
                      placeholder="Nhập lại mật khẩu"
                      className={`w-full pl-9 pr-10 py-2 bg-black/50 border rounded-xl text-white placeholder:text-white/30 focus:outline-none text-xs transition ${
                        fieldErrors.confirmPassword ? 'border-rose-500 focus:border-rose-400' : 'border-white/20 focus:border-amber-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-white/40 hover:text-white transition"
                      title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <div className="flex items-center gap-1 text-[11px] text-rose-400 pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.confirmPassword}</span>
                    </div>
                  )}
                </div>

                {/* Submit button on Desktop */}
                <div className="hidden md:block pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 font-extrabold rounded-2xl transition shadow-xl flex items-center justify-center gap-2 active:scale-95 text-xs bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-black hover:opacity-95 shadow-amber-500/20"
                  >
                    <span>{loading ? 'Đang khởi tạo...' : 'Khởi Tạo Tay Đua & Vào Trường Đua'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* CỘT PHẢI: GARA 3D & CHỌN CHIẾN HẠM */}
              <div className="md:col-span-6 space-y-2.5 mt-4 md:mt-0">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gara Chiến Hạm & Siêu Xe 3D 360°:</span>
                  </label>
                  <span className="text-[10px] text-cyan-300 font-mono px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30">
                    ⚡ {RACER_AVATARS.find(v => v.id === selectedAvatar)?.speed} Tốc độ
                  </span>
                </div>

                {/* 3D Interactive Model Preview */}
                <Suspense
                  fallback={
                    <div className="w-full h-44 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-xs text-cyan-300/60 animate-pulse">
                      Đang tải mô hình 3D...
                    </div>
                  }
                >
                  <RacerVehicle3DCanvas selectedAvatar={selectedAvatar} />
                </Suspense>

                {/* Danh sách 5 xe đua chọn nhanh */}
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] text-white/50 font-semibold">
                    Nhấp chọn xe bên dưới để đổi mô hình 3D ngay lập tức:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2">
                    {RACER_AVATARS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedAvatar(v.id)}
                        className={`p-2 rounded-xl border text-left transition flex items-center gap-2 ${
                          selectedAvatar === v.id
                            ? 'bg-amber-400/20 border-amber-400 text-white shadow-md shadow-amber-500/20 scale-[1.02]'
                            : 'bg-black/40 border-white/10 text-white/60 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        <span className="text-lg shrink-0">{v.icon}</span>
                        <div className="overflow-hidden min-w-0">
                          <div className="font-bold text-[11px] truncate text-white">{v.name}</div>
                          <div className="text-[9px] text-white/50 truncate">{v.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button on Mobile */}
                <div className="block md:hidden pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 font-extrabold rounded-2xl transition shadow-xl flex items-center justify-center gap-2 active:scale-95 text-xs bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-black hover:opacity-95 shadow-amber-500/20"
                  >
                    <span>{loading ? 'Đang khởi tạo...' : 'Khởi Tạo Tay Đua & Vào Trường Đua'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/50 flex items-center justify-between text-[10px] text-white/50">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dữ liệu cá nhân & Pomodoro riêng biệt</span>
          </div>
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-cyan-300 hover:underline font-bold"
          >
            {mode === 'login' ? 'Chưa có nick? Đăng ký' : 'Đã có nick? Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  )
}
