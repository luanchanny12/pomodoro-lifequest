import { useState, Suspense, lazy, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar3D from './Sidebar3D'
import Topbar3D from './Topbar3D'
import BackgroundEffects from './BackgroundEffects'
import CommandPalette from '@/components/CommandPalette'
import AIGuideChat from '@/components/ai/AIGuideChat'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

const AICoreScene = lazy(() => import('@/components/scenes/AICoreScene'))

interface LifeOSLayoutProps {
  children: ReactNode
}

export default function LifeOSLayout({ children }: LifeOSLayoutProps) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  useKeyboardShortcuts({
    onCommandPalette: () => setCommandPaletteOpen(true),
    onEscape: () => setCommandPaletteOpen(false),
    onShortcutsHelp: () => {},
  })

  return (
    <div className="relative min-h-screen bg-[#05070D]">
      <BackgroundEffects />

      {isHome && (
        <Suspense fallback={null}>
          <AICoreScene />
        </Suspense>
      )}

      <Sidebar3D />

      <div className="pl-[76px] pr-4 pb-6 min-h-screen flex flex-col">
        <Topbar3D />

        <main className="flex-1 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <div className="max-w-[1400px] mx-auto">
                {children}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <AIGuideChat />
    </div>
  )
}
