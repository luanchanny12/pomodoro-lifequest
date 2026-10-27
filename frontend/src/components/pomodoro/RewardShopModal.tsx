import React, { useState, useEffect } from 'react'
import {
  X,
  Sparkles,
  Plus,
  Ticket,
  Clock,
  CheckCircle2,
  Lock,
  Gift,
  Film,
  Gamepad2,
  Coffee,
  Bed,
  Utensils,
  History,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  focusService,
  RewardItem,
  RewardRedemption,
  PearlsBalance,
} from '@/services/focusService'
import { soundManager } from '@/utils/soundEffects'

interface RewardShopModalProps {
  isOpen: boolean
  onClose: () => void
  onRewardRedeemed?: () => void
}

export const RewardShopModal: React.FC<RewardShopModalProps> = ({
  isOpen,
  onClose,
  onRewardRedeemed,
}) => {
  const [rewards, setRewards] = useState<RewardItem[]>([])
  const [balance, setBalance] = useState<PearlsBalance>({
    total_earned_pearls: 0,
    spent_pearls: 0,
    available_pearls: 0,
  })
  const [history, setHistory] = useState<RewardRedemption[]>([])
  const [activeTab, setActiveTab] = useState<'shop' | 'history'>('shop')

  // Create custom reward modal state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCost, setNewCost] = useState(2.0)
  const [newIcon, setNewIcon] = useState('🎁')
  const [newCategory, setNewCategory] = useState('giải trí')
  const [newDesc, setNewDesc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Golden Pass modal
  const [redeemedTicket, setRedeemedTicket] = useState<RewardRedemption | null>(null)

  const loadData = async () => {
    try {
      const [shopData, historyData] = await Promise.all([
        focusService.getRewards(),
        focusService.getRedemptionHistory(),
      ])
      setRewards(shopData.items)
      setBalance(shopData.balance)
      setHistory(historyData)
    } catch (err) {
      console.error('Error loading rewards:', err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleRedeem = async (item: RewardItem) => {
    if (balance.available_pearls < item.pearl_cost) {
      toast.error(
        `Bạn cần ${item.pearl_cost} ngọc nhưng hiện chỉ có ${balance.available_pearls} ngọc. Hãy học thêm một chút nhé!`
      )
      return
    }

    try {
      const res = await focusService.redeemReward(item.id)
      soundManager.playRedeemSuccess()
      setRedeemedTicket(res)
      toast.success(`Đã đổi thành công vé "${item.title}"!`)
      await loadData()
      if (onRewardRedeemed) onRewardRedeemed()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi đổi phần thưởng')
    }
  }

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      toast.error('Vui lòng nhập tên phần thưởng')
      return
    }
    try {
      setIsSubmitting(true)
      await focusService.createReward({
        title: newTitle.trim(),
        pearl_cost: newCost,
        icon: newIcon,
        category: newCategory,
        description: newDesc.trim() || undefined,
      })
      toast.success(`Đã tạo phần thưởng "${newTitle}"!`)
      setShowCreateForm(false)
      setNewTitle('')
      setNewDesc('')
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo phần thưởng')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#141720] border border-white/20 rounded-3xl shadow-2xl p-6 text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-yellow-600 text-black rounded-2xl shadow-lg shadow-amber-500/25">
              <Gift className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Chợ Đổi Thưởng Thực Tế
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full">
                  Guilt-Free
                </span>
              </h2>
              <p className="text-xs text-white/60">
                1 giờ học tập = 1 Ngọc pha lê. Tận hưởng cuộc sống mà không chút mặc cảm!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── CRYSTAL JAR DISPLAY (PEARLS BALANCE) ── */}
        <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-400/30 flex items-center justify-between flex-shrink-0 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/25 border border-amber-400/40 flex items-center justify-center text-2xl shadow-md animate-pulse">
              💎
            </div>
            <div>
              <div className="text-xs text-amber-200/80 uppercase tracking-wider font-semibold">
                Quỹ Ngọc Khả Dụng
              </div>
              <div className="text-2xl font-black text-amber-300 flex items-baseline gap-1.5">
                <span>{balance.available_pearls}</span>
                <span className="text-xs font-semibold text-white/70">Viên Ngọc</span>
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-white/60 space-y-0.5 hidden sm:block">
            <div>Đã đúc từ học tập: <strong className="text-white">{balance.total_earned_pearls} 💎</strong></div>
            <div>Đã đổi phần thưởng: <strong className="text-white">{balance.spent_pearls} 💎</strong></div>
            <div className="text-[10px] text-amber-400/80">1 giờ học = 1 Ngọc</div>
          </div>
        </div>

        {/* Tabs: Shop vs History */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 flex-shrink-0 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('shop')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === 'shop'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Gian hàng phần thưởng</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Vé đã đổi ({history.length})</span>
            </button>
          </div>

          {activeTab === 'shop' && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 font-semibold hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tự tạo phần thưởng riêng</span>
            </button>
          )}
        </div>

        {/* Create Custom Reward Form */}
        {showCreateForm && activeTab === 'shop' && (
          <form
            onSubmit={handleCreateCustom}
            className="mb-4 p-4 rounded-2xl bg-black/40 border border-amber-400/40 space-y-3 animate-in fade-in duration-200 flex-shrink-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Thêm phần thưởng cá nhân của bạn
              </span>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-white/70 mb-1">Tên phần thưởng *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Ăn lẩu cuối tuần, Mua đôi giày mới..."
                  className="w-full px-3 py-1.5 bg-[#141720] border border-white/20 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1">Chi phí (Ngọc) *</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={newCost}
                  onChange={(e) => setNewCost(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 bg-[#141720] border border-white/20 rounded-xl text-white text-xs text-center font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 text-base">
                {['🎬', '🎮', '🧋', '🛌', '🍣', '🎧', '🍕', '🏖️'].map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setNewIcon(ic)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                      newIcon === ic ? 'bg-amber-400/40 border border-amber-400 scale-110' : 'hover:bg-white/10'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold rounded-xl transition shadow disabled:opacity-50"
              >
                {isSubmitting ? 'Đang tạo...' : 'Lưu phần thưởng'}
              </button>
            </div>
          </form>
        )}

        {/* ── SHOP TAB: REWARDS GRID ── */}
        {activeTab === 'shop' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rewards.map((item) => {
                const canAfford = balance.available_pearls >= item.pearl_cost
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-white/15 bg-white/5 hover:border-amber-400/50 transition flex flex-col justify-between shadow-lg relative overflow-hidden group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{item.icon}</span>
                          <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition">
                            {item.title}
                          </h4>
                        </div>
                        <span className="px-2.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-black whitespace-nowrap shadow-sm">
                          {item.pearl_cost} 💎
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-white/60 line-clamp-2 pl-9">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[11px] text-white/50">
                        {canAfford ? (
                          <span className="text-emerald-400 font-medium">✓ Đủ ngọc để đổi</span>
                        ) : (
                          <span>Còn thiếu {(item.pearl_cost - balance.available_pearls).toFixed(1)} 💎</span>
                        )}
                      </span>

                      <button
                        onClick={() => handleRedeem(item)}
                        disabled={!canAfford}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5 ${
                          canAfford
                            ? 'bg-amber-400 hover:bg-amber-300 text-black active:scale-95'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                        }`}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Đổi vé ngay</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB: REDEEMED TICKETS ── */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
            {history.length === 0 ? (
              <div className="text-center py-12 text-white/50 bg-white/5 rounded-2xl border border-white/10">
                Bạn chưa đổi vé phần thưởng nào. Hãy tích lũy ngọc và tự thưởng cho mình nhé!
              </div>
            ) : (
              history.map((h) => (
                <div
                  key={h.id}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{h.reward_icon}</span>
                    <div>
                      <div className="font-bold text-sm text-white">{h.reward_title}</div>
                      <div className="text-[11px] text-white/50">
                        Đổi lúc: {new Date(h.redeemed_at).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px]">
                      -{h.pearls_spent} 💎 Đã tận hưởng
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-white/10 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-white/15 hover:bg-white/25 text-white rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* ── GOLDEN PASS TICKET MODAL (AFTER REDEEMING) ── */}
      {redeemedTicket && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#2A200A] via-[#1A1608] to-[#120E05] border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl overflow-hidden">
            {/* Ticket Cutout Circles */}
            <div className="absolute -left-4 top-1/2 -mt-4 w-8 h-8 rounded-full bg-black/90 border border-amber-400/50" />
            <div className="absolute -right-4 top-1/2 -mt-4 w-8 h-8 rounded-full bg-black/90 border border-amber-400/50" />

            <div className="text-4xl mb-2 animate-bounce">🎉</div>
            <div className="inline-block px-3 py-1 bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-full mb-3 shadow">
              VÉ TẬN HƯỞNG PHA LÊ
            </div>

            <h3 className="text-2xl font-black text-amber-300 mb-1">
              {redeemedTicket.reward_icon} {redeemedTicket.reward_title}
            </h3>

            <p className="text-xs text-amber-200/80 mb-6">
              Bạn đã đầu tư <strong>{redeemedTicket.pearls_spent} giờ học</strong> để đổi lấy khoảnh khắc này!
            </p>

            {/* Red Wax Guarantee Stamp */}
            <div className="p-4 rounded-2xl bg-red-500/20 border-2 border-red-500/60 mb-6 text-red-300 font-bold text-xs uppercase tracking-wider shadow-inner">
              ✓ BẠN HOÀN TOÀN XỨNG ĐÁNG ĐỂ TẬN HƯỞNG MÀ KHÔNG MẶC CẢM!
            </div>

            <button
              onClick={() => setRedeemedTicket(null)}
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-sm rounded-2xl shadow-xl transition active:scale-95"
            >
              Tận hưởng ngay thôi!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
