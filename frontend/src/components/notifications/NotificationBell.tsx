import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellRing, CheckCheck, X, Clock } from 'lucide-react'
import { useNotifications, useMarkNotificationRead } from '@/services/aiService'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

function getTypeIcon(type: string) {
  switch (type) {
    case 'reminder': return <Clock className="h-4 w-4 text-blue-500" />
    case 'achievement': return <BellRing className="h-4 w-4 text-yellow-500" />
    case 'warning': return <BellRing className="h-4 w-4 text-red-500" />
    default: return <Bell className="h-4 w-4 text-muted-foreground" />
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: notifications, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()

  const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0

  function handleMarkRead(id: number) {
    markRead.mutate(id)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <motion.div
          animate={unreadCount > 0 ? { rotate: [0, -15, 15, -15, 0] } : {}}
          transition={{ duration: 0.5, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 5 }}
        >
          {unreadCount > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </motion.div>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="font-semibold text-sm">Thông báo</span>
              {unreadCount > 0 && (
                <span className="text-xs text-muted-foreground">{unreadCount} chưa đọc</span>
              )}
            </div>

            <ScrollArea className="max-h-80">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="h-8 w-8 rounded-full bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-3/4 rounded bg-muted" />
                        <div className="h-2 w-1/2 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications && notifications.length > 0 ? (
                <div className="py-1">
                  {notifications.map((n) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer border-b last:border-0',
                        !n.is_read && 'bg-accent/30'
                      )}
                      onClick={() => { if (!n.is_read) handleMarkRead(n.id) }}
                    >
                      <div className="mt-0.5">{getTypeIcon(n.notification_type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm', !n.is_read && 'font-medium')}>{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {n.created_at ? format(parseISO(n.created_at), 'HH:mm dd/MM') : ''}
                        </p>
                      </div>
                      {!n.is_read && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id) }}>
                          <CheckCheck className="h-3 w-3" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-12 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Không có thông báo</p>
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  )
}
