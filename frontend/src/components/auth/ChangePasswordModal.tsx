import React, { useState, useEffect } from 'react'
import { X, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '@/services/authService'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowCurrent(false)
      setShowNew(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Vui lòng nhập đầy đủ 3 trường!')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu mới và xác nhận không khớp!')
      return
    }
    if (newPassword === currentPassword) {
      toast.error('Mật khẩu mới phải khác mật khẩu hiện tại!')
      return
    }

    setLoading(true)
    try {
      const res = await authService.changePassword(currentPassword, newPassword)
      toast.success(res.message || 'Đã đổi mật khẩu thành công! 🔐')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Đổi mật khẩu thất bại, vui lòng thử lại!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-[#121622] border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/60 to-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center">
              <Lock className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Đổi Mật Khẩu</h3>
              <p className="text-[11px] text-white/60">Bảo vệ tài khoản của bạn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Current password */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/80">Mật khẩu hiện tại:</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại..."
                className="w-full pl-9 pr-9 py-2 bg-black/50 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-white/40 hover:text-white/70 transition"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/80">Mật khẩu mới (ít nhất 6 ký tự):</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full pl-9 pr-9 py-2 bg-black/50 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-white/40 hover:text-white/70 transition"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/80">Xác nhận mật khẩu mới:</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full pl-9 pr-3 py-2 bg-black/50 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 text-xs"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 font-extrabold rounded-xl transition shadow-lg flex items-center justify-center gap-2 active:scale-95 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-95 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{loading ? 'Đang xử lý...' : 'Đổi Mật Khẩu Ngay'}</span>
            </button>
          </div>
        </form>

        <div className="px-6 py-3 border-t border-white/10 bg-black/50 text-[10px] text-white/50">
          💡 Mẹo: dùng mật khẩu mạnh gồm chữ hoa, chữ thường và số để bảo vệ tài khoản.
        </div>
      </div>
    </div>
  )
}
