import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
}

export default function GlassCard({ children, className, hover = false, glow = false }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={hover ? { y: -3, transition: { duration: 0.2 } } : undefined}
      className={cn(
        'glass-card p-5 relative group',
        glow && 'hover:shadow-glow',
        hover && 'cursor-pointer',
        className
      )}
    >
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.03), transparent 50%, rgba(108,99,255,0.03))' }}
      />
      {children}
    </motion.div>
  )
}

export function GlassCardHeader({ children, className, action }: { children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div className="text-sm font-semibold text-foreground/90">{children}</div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

export function GlassCardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('', className)}>{children}</div>
}
