import { create } from 'zustand'

// Pure in-memory UI state — which month/year the whole app is currently
// browsing to. Deliberately not Firestore-synced (it's a navigation
// concern, not user data) and deliberately its own store rather than
// folded into useBudgetStore, whose whole identity is "Firestore-synced
// data." Shared by every page/tab that renders a MonthYearPicker, so
// changing the date in one place is reflected everywhere else — the
// dashboard's top summary row, all 4 tabs, and the standalone
// /budget //spending /income /tax routes all read/write this same state.
interface DateFilterState {
  referenceDate: Date
  setReferenceDate: (date: Date) => void
}

export const useDateFilterStore = create<DateFilterState>((set) => ({
  referenceDate: new Date(),
  setReferenceDate: (date) => set({ referenceDate: date }),
}))
