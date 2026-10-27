import { motion } from 'framer-motion'
import { Swords } from 'lucide-react'

export default function CyberLoadingPage() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#05070D]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-full border-2 border-[#00E5FF]/10 border-t-[#00E5FF] border-r-[#6C63FF]" style={{ boxShadow: '0 0 30px rgba(0,229,255,0.05)' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Swords className="h-6 w-6 text-[#00E5FF]/60" />
        </div>
      </motion.div>

      <div className="mt-8 space-y-2 text-center">
        <div className="flex items-center gap-3 justify-center">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#00E5FF]/30" />
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xs font-mono tracking-[0.3em] text-muted-foreground"
          >
            INITIALIZING
          </motion.span>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#00E5FF]/30" />
        </div>
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
