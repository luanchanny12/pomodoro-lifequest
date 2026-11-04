import React from 'react'
import {
  Shield,
  Key,
  Lock,
  Unlock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Check,
} from 'lucide-react'
import { AdminUserItem } from '@/services/adminService'
import { UserProfile } from '@/services/authService'

export interface AdminUserModalsProps {
  currentUser: UserProfile | null
  users: AdminUserItem[]
  // Role Modal
  roleModalUser: AdminUserItem | null
  roleModalIsAdmin: boolean
  setRoleModalIsAdmin: (v: boolean) => void
  roleModalLoading: boolean
  onCloseRoleModal: () => void
  onSaveRole: () => void
  // Reset Password Modal
  resetModalUser: AdminUserItem | null
  newPassword: string
  setNewPassword: (v: string) => void
  resetting: boolean
  onCloseResetModal: () => void
  onResetPassword: () => void
  // Status Modal
  statusModalUser: AdminUserItem | null
  statusModalLoading: boolean
  onCloseStatusModal: () => void
  onConfirmToggleStatus: () => void
  // Delete Modal
  deleteModalUser: AdminUserItem | null
  deleteConfirmText: string
  setDeleteConfirmText: (v: string) => void
  deleteModalLoading: boolean
  onCloseDeleteModal: () => void
  onConfirmDeleteUser: () => void
}

export const AdminUserModals: React.FC<AdminUserModalsProps> = ({
  roleModalUser,
  roleModalIsAdmin,
  setRoleModalIsAdmin,
  roleModalLoading,
  onCloseRoleModal,
  onSaveRole,
  resetModalUser,
  newPassword,
  setNewPassword,
  resetting,
  onCloseResetModal,
  onResetPassword,
  statusModalUser,
  statusModalLoading,
  onCloseStatusModal,
  onConfirmToggleStatus,
  deleteModalUser,
  deleteConfirmText,
  setDeleteConfirmText,
  deleteModalLoading,
  onCloseDeleteModal,
  onConfirmDeleteUser,
}) => {
  return (
    <>
      {/* ── MODAL 1: GÁN QUYỀN (ROLE ASSIGNMENT MODAL) ── */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#121929] border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Gán Quyền & Phân Vai Trò</h3>
                  <p className="text-xs text-slate-400">
                    Tài khoản: <strong className="text-slate-200">@{roleModalUser.username}</strong> ({roleModalUser.display_name})
                  </p>
                </div>
              </div>
              <button
                onClick={onCloseRoleModal}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Role Options */}
            <div className="space-y-3">
              {/* Option 1: Normal Member */}
              <div
                onClick={() => setRoleModalIsAdmin(false)}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3.5 ${
                  !roleModalIsAdmin
                    ? 'bg-cyan-950/40 border-cyan-500/60 ring-1 ring-cyan-500/40'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    !roleModalIsAdmin ? 'border-cyan-400 bg-cyan-500 text-slate-950' : 'border-slate-600'
                  }`}
                >
                  {!roleModalIsAdmin && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">👤 Thành Viên Thông Thường (Member)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                      Mặc định
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Tài khoản người dùng thông thường: cày Pomodoro, quản lý mục tiêu cá nhân, ma trận 4 ô, tham gia trường đua F1. <strong>Không thể</strong> truy cập Cổng Quản Trị Hệ Thống.
                  </p>
                </div>
              </div>

              {/* Option 2: Administrator */}
              <div
                onClick={() => setRoleModalIsAdmin(true)}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3.5 ${
                  roleModalIsAdmin
                    ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/40'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    roleModalIsAdmin ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-600'
                  }`}
                >
                  {roleModalIsAdmin && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-amber-300">👑 Quản Trị Viên (Administrator)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      Toàn Quyền
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Có toàn quyền truy cập Cổng Quản Trị, giám sát tiến độ và mục tiêu của bạn bè, đổi mật khẩu, phân quyền cho người khác và xem thống kê website.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={onCloseRoleModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={onSaveRole}
                disabled={roleModalLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Shield className="w-4 h-4" />
                <span>{roleModalLoading ? 'Đang lưu...' : 'Xác Nhận Phân Quyền'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ĐẶT LẠI MẬT KHẨU ── */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121929] border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Đặt Lại Mật Khẩu</h3>
                  <p className="text-xs text-slate-400">Tài khoản: @{resetModalUser.username}</p>
                </div>
              </div>
              <button
                onClick={onCloseResetModal}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Nhập mật khẩu mới để cấp lại cho bạn <strong>{resetModalUser.display_name}</strong> (ít nhất 4 ký tự):
            </p>

            <input
              type="text"
              placeholder="Nhập mật khẩu mới..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#162032] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 outline-none transition"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={onCloseResetModal}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Hủy
              </button>
              <button
                onClick={onResetPassword}
                disabled={resetting || !newPassword.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition active:scale-95 disabled:opacity-50"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{resetting ? 'Đang lưu...' : 'Lưu Mật Khẩu Mới'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: KHÓA / MỞ KHÓA TÀI KHOẢN ── */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121929] border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    statusModalUser.is_active
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {statusModalUser.is_active ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {statusModalUser.is_active ? 'Khóa Tài Khoản Người Dùng' : 'Mở Khóa Tài Khoản'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tài khoản: <strong className="text-cyan-300">@{statusModalUser.username}</strong> ({statusModalUser.display_name})
                  </p>
                </div>
              </div>
              <button
                onClick={onCloseStatusModal}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 text-xs space-y-2">
              {statusModalUser.is_active ? (
                <>
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Xác nhận khóa tài khoản:</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Khi bị khóa, người bạn này <strong>sẽ không thể đăng nhập</strong> vào hệ thống Pomodoro LifeQuest.
                    Toàn bộ dữ liệu mục tiêu và giờ học vẫn được bảo lưu nguyên vẹn, bạn có thể mở khóa lại bất kỳ lúc nào.
                  </p>
                </>
              ) : (
                <>
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Xác nhận mở khóa tài khoản:</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Sau khi mở khóa, người dùng này có thể đăng nhập bình thường và tiếp tục hành trình đua top, tích lũy ngọc và hoàn thành mục tiêu.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={onCloseStatusModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={onConfirmToggleStatus}
                disabled={statusModalLoading}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition active:scale-95 shadow-lg disabled:opacity-50 ${
                  statusModalUser.is_active
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                {statusModalUser.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span>
                  {statusModalLoading
                    ? 'Đang xử lý...'
                    : statusModalUser.is_active
                    ? 'Xác Nhận Khóa Tài Khoản'
                    : 'Xác Nhận Mở Khóa'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: XÓA VĨNH VIỄN TÀI KHOẢN (DANGER ZONE) ── */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#14121a] border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-md shadow-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-rose-300 text-base">Xóa Vĩnh Viễn Tài Khoản</h3>
                  <p className="text-xs text-slate-400">
                    Người dùng: <strong className="text-white">@{deleteModalUser.username}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={onCloseDeleteModal}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-2">
              <div className="font-bold text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>HÀNH ĐỘNG NGUY HIỂM & KHÔNG THỂ HOÀN TÁC!</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Tài khoản <strong>@{deleteModalUser.username}</strong> ({deleteModalUser.display_name}) và toàn bộ dữ liệu đi kèm sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] pl-1">
                <li>Tất cả mục tiêu học tập (Goals)</li>
                <li>Tất cả lịch sử các phiên Pomodoro (Sessions)</li>
                <li>Toàn bộ nhiệm vụ trong Ma Trận 4 Ô</li>
                <li>Cấu hình thông báo Telegram & thành tích đua top</li>
              </ul>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-slate-400">
                Để xác nhận, vui lòng gõ chính xác username <code className="text-rose-300 font-bold bg-rose-500/10 px-1 py-0.5 rounded">@{deleteModalUser.username}</code>:
              </label>
              <input
                type="text"
                placeholder={deleteModalUser.username}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-[#1b1725] border border-rose-500/30 focus:border-rose-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={onCloseDeleteModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={onConfirmDeleteUser}
                disabled={deleteModalLoading || deleteConfirmText.trim().replace(/^@/, '') !== deleteModalUser.username}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition active:scale-95 shadow-lg shadow-rose-600/30 disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleteModalLoading ? 'Đang xóa...' : 'Xác Nhận Xóa Vĩnh Viễn'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AdminUserModals
