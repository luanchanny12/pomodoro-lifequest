import React from 'react'
import {
  Heart,
  Coffee,
  MessageSquarePlus,
  Trophy,
  Shield,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface FooterProps {
  onOpenDonate: () => void
  onOpenFeedback: () => void
  onOpenRace: () => void
  isAdmin?: boolean
}

const FooterComponent: React.FC<FooterProps> = ({
  onOpenDonate,
  onOpenFeedback,
  onOpenRace,
  isAdmin,
}) => {
  const navigate = useNavigate()

  return (
    <footer className="relative z-20 mt-12 border-t border-white/10 bg-black/60 backdrop-blur-xl text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Top Action Ribbon */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-cyan-500/15 border border-white/10 shadow-xl mb-6">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 text-lg shadow-sm flex-shrink-0">
              ☕
            </div>
            <div>
              <div className="text-xs font-bold text-amber-200">
                Ủng hộ tác giả & Đóng góp ý kiến
              </div>
              <p className="text-[11px] text-white/60">
                Chung tay duy trì máy chủ & xây dựng cộng đồng học tập không ngừng tiến bộ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center w-full sm:w-auto">
            {/* Donate Button */}
            <button
              onClick={onOpenDonate}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-extrabold text-xs shadow-lg shadow-amber-400/20 flex items-center gap-1.5 transition active:scale-95"
            >
              <Heart className="w-3.5 h-3.5 fill-black" />
              <span>Donate for me ☕</span>
            </button>

            {/* Feedback Button */}
            <button
              onClick={onOpenFeedback}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 flex items-center gap-1.5 transition active:scale-95"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-cyan-300" />
              <span>Góp ý web</span>
            </button>
          </div>
        </div>

        {/* Middle Links & Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-b border-white/10 text-xs">
          {/* Brand */}
          <div className="space-y-1.5">
            <div className="font-extrabold text-sm text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-cyan-300 to-white">
              POMODORO LIFEQUEST 3.0
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">
              Hệ thống quản lý thời gian, rèn luyện thói quen học tập tập trung 1000 giờ, thắp sáng chòm sao và thi đua bảng vàng F1 cùng bạn bè.
            </p>
          </div>

          {/* Quick Nav */}
          <div className="space-y-1.5">
            <div className="font-bold text-white/80 uppercase tracking-wider text-[11px]">
              Lối Tắt Hữu Ích
            </div>
            <div className="flex flex-col gap-1 text-[11px] text-white/60">
              <button
                onClick={onOpenRace}
                className="hover:text-cyan-300 text-left transition flex items-center gap-1.5"
              >
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>Bảng Vàng & Đường Đua Bạn Bè (F1)</span>
              </button>
              <button
                onClick={onOpenFeedback}
                className="hover:text-cyan-300 text-left transition flex items-center gap-1.5"
              >
                <MessageSquarePlus className="w-3 h-3 text-cyan-400" />
                <span>Hòm Thư Nhận Xét & Góp Ý</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="hover:text-amber-300 text-left transition flex items-center gap-1.5 text-amber-400 font-semibold"
                >
                  <Shield className="w-3 h-3" />
                  <span>Cổng Quản Trị Hệ Thống (Admin Portal)</span>
                </button>
              )}
            </div>
          </div>

          {/* Donation Account Info */}
          <div className="space-y-1.5">
            <div className="font-bold text-white/80 uppercase tracking-wider text-[11px]">
              Tài Khoản Ủng Hộ (MB Bank)
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] space-y-1">
              <div className="text-white/60">MB Bank (Ngân Hàng Quân Đội)</div>
              <div className="font-mono font-bold text-amber-300 text-xs tracking-wider">
                STK: 1211059999
              </div>
              <div className="text-[10px] text-white/40">Chủ TK: NGUYEN THANH LUAN</div>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/50 text-center sm:text-left">
          <div>
            © {new Date().getFullYear()} Pomodoro LifeQuest • Phát triển với ❤️ bởi Luân dành cho bạn bè và cộng đồng học tập.
          </div>
          <div className="flex items-center gap-3">
            <span>Phiên bản 3.0.0</span>
            <span>•</span>
            <span className="text-emerald-400">Hệ thống đang hoạt động tốt 🟢</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export const Footer = React.memo(FooterComponent)
