import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface ShortcutHandlers {
  onCommandPalette: () => void
  onShortcutsHelp?: () => void
  onEscape?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const navigate = useNavigate()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey

      if (e.key === 'Escape') {
        handlers.onEscape?.()
        return
      }

      if (ctrl && e.key === 'k') {
        e.preventDefault()
        handlers.onCommandPalette()
        return
      }

      if (ctrl && e.key === 'd') {
        e.preventDefault()
        navigate('/')
        return
      }

      if (ctrl && e.key === 't') {
        e.preventDefault()
        navigate('/today')
        return
      }

      if ((e.key === '?' || e.key === 'h') && !ctrl) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          handlers.onShortcutsHelp?.()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers, navigate])
}
