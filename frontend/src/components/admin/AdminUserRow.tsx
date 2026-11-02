import React from 'react'
import {
  Shield,
  Key,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Flame,
  Lock,
  Unlock,
} from 'lucide-react'
import { AdminUserItem } from '@/services/adminService'

interface AdminUserRowProps {
  user: AdminUserItem
  isCurrentUser: boolean
  getVehicleIcon: (avatar: string) => string
  onInspect: (id: number) => void
  onOpenRoleModal: (u: AdminUserItem) => void
  onToggleStatus: (u: AdminUserItem) => void
  onOpenResetModal: (u: AdminUserItem) => void
  onDeleteUser: (u: AdminUserItem) => void
}

export const AdminUserRow = React.memo<AdminUserRowProps>(({
  user: u,
  isCurrentUser,
  getVehicleIcon,
  onInspect,
  onOpenRoleModal,
  onToggleStatus,
  onOpenResetModal,
  onDeleteUser,
}) => {
  return (
    <tr className="hover:bg-slate-800/30 transition group">
      {/* Column 1: User */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-xl shadow-sm">
            {getVehicleIcon(u.racer_avatar)}
          </div>
          <div>
            <div className="font-bold text-white text-sm flex items-center gap-1.5">
              <span>{u.display_name}</span>
              {u.has_telegram && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                  TG
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400">@{u.username}</div>
          </div>
        </div>
      </td>

      {/* Column 2: Role & Role Assignment Button */}
      <td className="py-3.5 px-4 text-center">
        <div className="inline-flex items-center gap-2">
          {/* Role Tag */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
              u.is_admin
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <span>{u.is_admin ? '👑 Quản Trị Viên' : '👤 Thành Viên'}</span>
          </span>

          {/* Gán Quyền Button */}
          <button
            onClick={() => onOpenRoleModal(u)}
            className="px-2.5 py-1 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition active:scale-95 flex items-center gap-1 shadow-sm"
            title="Bấm để gán quyền Quản Trị Viên hoặc Thành Viên"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-300" />
            <span>Gán quyền</span>
          </button>
        </div>
      </td>

      {/* Column 3: Level & Streak */}
      <td className="py-3.5 px-4 text-center">
        <div className="flex items-center justify-center gap-1.5 font-bold">
          <span className="text-cyan-400">Lv.{u.level}</span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 flex items-center gap-0.5">
            <Flame className="w-4 h-4" />
            {u.streak}d
          </span>
        </div>
      </td>

      {/* Column 4: Total Study Hours */}
      <td className="py-3.5 px-4 text-center font-bold text-white text-sm">
        {u.total_hours}h
        {u.today_hours > 0 && (
          <span className="block text-[11px] text-emerald-400 font-semibold">
            (+{u.today_hours}h hôm nay)
          </span>
        )}
      </td>

      {/* Column 5: Goals */}
      <td className="py-3.5 px-4 text-center">
        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 text-xs">
          {u.goal_count} mục tiêu
        </span>
      </td>

      {/* Column 6: Status */}
      <td className="py-3.5 px-4 text-center">
        <button
          onClick={() => onToggleStatus(u)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition ${
            u.is_active
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30'
          }`}
          title="Bấm để Khóa / Mở khóa tài khoản"
        >
          {u.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          <span>{u.is_active ? 'Hoạt động' : 'Đã khóa'}</span>
        </button>
      </td>

      {/* Column 7: Actions */}
      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {/* Soi Hoạt Động */}
          <button
            onClick={() => onInspect(u.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition active:scale-95 shadow-sm"
            title="Xem chi tiết mục tiêu, phiên học và ma trận công việc"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Soi hoạt động</span>
          </button>

          {/* Reset Password */}
          <button
            onClick={() => onOpenResetModal(u)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition active:scale-95"
            title="Đặt lại mật khẩu cho tài khoản này"
          >
            <Key className="w-4 h-4" />
          </button>

          {/* Lock / Unlock User */}
          {!isCurrentUser && (
            <button
              onClick={() => onToggleStatus(u)}
              className={`p-1.5 rounded-xl border transition active:scale-95 ${
                u.is_active
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
              title={u.is_active ? 'Khóa tài khoản này' : 'Mở khóa tài khoản này'}
            >
              {u.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          )}

          {/* Delete User */}
          {!isCurrentUser && (
            <button
              onClick={() => onDeleteUser(u)}
              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition active:scale-95"
              title="Xóa vĩnh viễn tài khoản này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
})
