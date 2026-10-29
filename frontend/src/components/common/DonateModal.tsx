import React, { useState } from 'react'
import {
  X,
  Heart,
  Copy,
  Check,
  Coffee,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  QrCode,
} from 'lucide-react'
import { toast } from 'sonner'

interface DonateModalProps {
  isOpen: boolean
  onClose: () => void
}

const PRESET_AMOUNTS = [
  { label: 'Tùy tâm', value: 0, icon: '✨' },
  { label: '10.000đ', value: 10000, icon: '🥤', desc: '1 Ly trà đá' },
  { label: '25.000đ', value: 25000, icon: '☕', desc: '1 Ly cà phê' },
  { label: '50.000đ', value: 50000, icon: '🍜', desc: '1 Tô phở ấm' },
  { label: '100.000đ', value: 100000, icon: '🚀', desc: '1 Tháng duy trì Server' },
]

export const DonateModal: React.FC<DonateModalProps> = ({ isOpen, onClose }) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(25000)
  const [copiedStk, setCopiedStk] = useState<boolean>(false)

  if (!isOpen) return null

  const bankName = 'MB Bank (Ngân hàng Quân Đội)'
  const accountNumber = '1211059999'
  const accountName = 'NGUYEN THANH LUAN'
  const memoText = 'Ung ho Pomodoro LifeQuest'

  // VietQR Dynamic URL (VietQR Standard)
  const qrUrl = selectedAmount > 0
    ? `https://img.vietqr.io/image/MB-${accountNumber}-compact2.png?amount=${selectedAmount}&addInfo=${encodeURIComponent(memoText)}&accountName=${encodeURIComponent(accountName)}`
    : `https://img.vietqr.io/image/MB-${accountNumber}-compact2.png?addInfo=${encodeURIComponent(memoText)}&accountName=${encodeURIComponent(accountName)}`

  const handleCopyStk = () => {
    navigator.clipboard.writeText(accountNumber)
    setCopiedStk(true)
    toast.success('Đã sao chép số tài khoản MB Bank: ' + accountNumber)
    setTimeout(() => setCopiedStk(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0f1422] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-amber-950/70 via-rose-950/50 to-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-white">
                ỦNG HỘ TÁC GIẢ (DONATE)
              </h3>
              <p className="text-[11px] text-white/60">
                Tiếp sức duy trì máy chủ & xây dựng tính năng mới
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Preset Buttons */}
          <div>
            <label className="block text-[11px] font-bold text-amber-200 uppercase tracking-wider mb-2">
              Chọn mức ủng hộ tùy tâm:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {PRESET_AMOUNTS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setSelectedAmount(item.value)}
                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                    selectedAmount === item.value
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20 font-bold'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[11px] font-bold">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* QR Code Frame */}
          <div className="relative p-4 rounded-2xl bg-white flex flex-col items-center justify-center shadow-inner group">
            <div className="text-[11px] font-bold text-slate-800 mb-1.5 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-blue-600" />
              <span>Quét mã qua mọi App Ngân hàng & MoMo</span>
            </div>

            <div className="w-56 h-56 sm:w-60 sm:h-60 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center relative overflow-hidden">
              <img
                src={qrUrl}
                alt="VietQR MB Bank Donate"
                className="w-full h-full object-contain"
                loading="eager"
              />
            </div>

            <div className="mt-2 text-[10px] text-slate-500 font-medium text-center">
              Chuyển khoản tức thì 24/7 • Tự động nhận diện MB Bank
            </div>
          </div>

          {/* Bank Account Info Card */}
          <div className="bg-[#141b2d] border border-white/10 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
              <span className="text-white/60">Ngân hàng:</span>
              <span className="font-bold text-cyan-300">{bankName}</span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
              <span className="text-white/60">Số tài khoản:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-amber-300 text-sm tracking-wider">
                  {accountNumber}
                </span>
                <button
                  onClick={handleCopyStk}
                  className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 transition active:scale-95"
                >
                  {copiedStk ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedStk ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Chủ tài khoản:</span>
              <span className="font-bold text-white uppercase tracking-wider">{accountName}</span>
            </div>
          </div>

          {/* Warm Note */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/20 text-white/80 text-[11px] leading-relaxed">
            💬 <em>"Mỗi sự ủng hộ của bạn, dù là 1 ly trà đá hay 1 ly cà phê, đều là nguồn động lực vô giá giúp mình có kinh phí duy trì máy chủ Cloud và tiếp tục sáng tạo các tính năng mới giúp chúng mình cùng nhau học tập thật tập trung!"</em>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Chuyển khoản an toàn 100%</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
