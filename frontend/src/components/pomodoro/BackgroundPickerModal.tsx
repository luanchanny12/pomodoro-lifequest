import React from 'react'
import { X, Sparkles, Check, Sliders } from 'lucide-react'
import {
  BackgroundConfig,
  PRESET_THEMES,
} from './DynamicBackground'

interface BackgroundPickerModalProps {
  isOpen: boolean
  onClose: () => void
  currentConfig: BackgroundConfig
  onSelect: (config: BackgroundConfig) => void
}

export const BackgroundPickerModal: React.FC<BackgroundPickerModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSelect,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#181B24] border border-white/20 rounded-3xl shadow-2xl p-6 text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Hình nền & Không gian học tập</h2>
              <p className="text-xs text-white/60">
                Hình nền nghệ thuật chất lượng cao đồng bộ với âm nền thư giãn
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

        {/* Theme Grid */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {PRESET_THEMES.map((theme) => {
              const isSelected = currentConfig.id === theme.id
              return (
                <button
                  key={theme.id}
                  onClick={() => onSelect(theme)}
                  className={`relative h-28 rounded-2xl border text-left transition overflow-hidden group shadow-lg ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400 scale-[1.01]'
                      : 'border-white/15 hover:border-white/40'
                  }`}
                >
                  {/* Thumbnail Image */}
                  <img
                    src={theme.imageUrl}
                    alt={theme.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Dark gradient overlay for title legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                  {/* Info */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between z-10">
                    <div>
                      <div className="font-bold text-sm text-white drop-shadow">
                        {theme.name}
                      </div>
                      <div className="text-[10px] text-white/70">
                        {theme.canvasEffect && theme.canvasEffect !== 'none'
                          ? '✨ Có hiệu ứng chuyển động sống động'
                          : '🖼️ Hình ảnh phong cảnh sắc nét'}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center flex-shrink-0 shadow-lg font-bold">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Opacity Slider */}
          <div className="pt-4 border-t border-white/10 space-y-2 bg-black/30 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-xs font-semibold text-white/80">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                Độ tối lớp phủ (Giúp dễ đọc số đếm nếu hình nền quá sáng)
              </span>
              <span className="text-amber-300">
                {Math.round((currentConfig.overlayOpacity ?? 0.18) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.6"
              step="0.02"
              value={currentConfig.overlayOpacity ?? 0.18}
              onChange={(e) =>
                onSelect({
                  ...currentConfig,
                  overlayOpacity: parseFloat(e.target.value),
                })
              }
              className="w-full accent-amber-400 h-1.5 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-white/10 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black rounded-xl transition shadow"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
