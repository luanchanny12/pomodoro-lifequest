import React, { useState } from 'react'
import {
  X,
  User,
  Lock,
  Sparkles,
  Rocket,
  Zap,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { authService, UserProfile } from '@/services/authService'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: UserProfile) => void
}

const RACER_AVATARS = [
  { id: 'rocket', name: 'Tàu Vũ Trụ', icon: '🚀', desc: 'Lướt nhanh vạn dặm' },
  { id: 'cyber_car', name: 'Siêu Xe Neon', icon: '🏎️', desc: 'Bứt tốc ngoạn mục' },
  { id: 'quantum_saucer', name: 'Đĩa Bay Lượng Tử', icon: '🛸', desc: 'Dịch chuyển tức thời' },
  { id: 'lightning', name: 'Tia Chớp', icon: '⚡', desc: 'Nhanh như sét đánh' },
  { id: 'lightcycle', name: 'Mô Tô Ánh Sáng', icon: '🏍️', desc: 'Uốn lượn phong cách' },
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
  const [selectedAvatar, setSelectedAvatar] = useState('cyber_car')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin!')
      return
    }

    setLoading(true)
    try {
      if (mode === 'register') {
        if (!displayName.trim()) {
          toast.error('Vui lòng nhập tên hiển thị!')
          setLoading(false)
          return
        }
        const res = await authService.register(
          username.trim(),
          displayName.trim(),
          password,
          selectedAvatar
        )
        toast.success(`Chào mừng ${res.user.display_name} tham gia đường đua! 🎉`)
        onSuccess(res.user)
        onClose()
      } else {
        const res = await authService.login(username.trim(), password)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#121622] border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col">
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
                  : 'Chọn xe đua và lập kỷ lục tập trung mới'}
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
            onClick={() => setMode('login')}
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
            onClick={() => setMode('register')}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/80">
                Tên hiển thị (Tên bạn bè sẽ thấy trên đường đua):
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ví dụ: Luân Phi Công, Tuấn Cày Cuốc..."
                  className="w-full pl-9 pr-3 py-2 bg-black/50 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400 text-xs"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/80">
              Tên đăng nhập (Username viết liền):
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                placeholder="Ví dụ: luan123, tuanninja..."
                className="w-full pl-9 pr-3 py-2 bg-black/50 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/80">
              Mật khẩu:
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-9 pr-3 py-2 bg-black/50 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 text-xs"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Chọn Chiến Hạm / Siêu Xe Đua Của Bạn:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {RACER_AVATARS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedAvatar(v.id)}
                    className={`p-2.5 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      selectedAvatar === v.id
                        ? 'bg-amber-400/20 border-amber-400 text-white shadow-lg'
                        : 'bg-black/30 border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    <span className="text-xl">{v.icon}</span>
                    <div className="overflow-hidden">
                      <div className="font-bold text-[11px] truncate text-white">{v.name}</div>
                      <div className="text-[9px] text-white/50 truncate">{v.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 font-extrabold rounded-xl transition shadow-lg flex items-center justify-center gap-2 active:scale-95 text-xs ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:opacity-95'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-95'
              }`}
            >
              <span>{loading ? 'Đang xử lý...' : mode === 'register' ? 'Khởi Tạo Tay Đua & Vào Trường Đua' : 'Đăng Nhập Ngay'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/50 flex items-center justify-between text-[10px] text-white/50">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dữ liệu cá nhân & Pomodoro riêng biệt</span>
          </div>
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-cyan-300 hover:underline font-bold"
          >
            {mode === 'login' ? 'Chưa có nick? Đăng ký' : 'Đã có nick? Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  )
}
