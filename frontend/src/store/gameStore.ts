import { create } from 'zustand'

interface ExpPopup {
  id: string
  amount: number
  x: number
  y: number
}

interface GameStore {
  expPopups: ExpPopup[]
  showLevelUp: boolean
  levelUpAnimation: number | null
  addExpPopup: (amount: number, x: number, y: number) => void
  removeExpPopup: (id: string) => void
  triggerLevelUp: (level: number) => void
  dismissLevelUp: () => void
}

let popupId = 0

export const useGameStore = create<GameStore>((set) => ({
  expPopups: [],
  showLevelUp: false,
  levelUpAnimation: null,

  addExpPopup: (amount, x, y) => {
    const id = `exp-${++popupId}`
    set((state) => ({
      expPopups: [...state.expPopups, { id, amount, x, y }],
    }))
    setTimeout(() => {
      set((state) => ({
        expPopups: state.expPopups.filter((p) => p.id !== id),
      }))
    }, 1200)
  },

  removeExpPopup: (id) => {
    set((state) => ({
      expPopups: state.expPopups.filter((p) => p.id !== id),
    }))
  },

  triggerLevelUp: (level) => {
    set({ showLevelUp: true, levelUpAnimation: level })
    setTimeout(() => {
      set({ showLevelUp: false, levelUpAnimation: null })
    }, 3000)
  },

  dismissLevelUp: () => {
    set({ showLevelUp: false, levelUpAnimation: null })
  },
}))
