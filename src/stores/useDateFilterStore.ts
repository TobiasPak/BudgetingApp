import { useMemo } from 'react'
import { create } from 'zustand'
import {
  monthBounds,
  yearBounds,
  type DateFilterMode,
  type DateRange,
} from '@/lib/period'

// Pure in-memory UI state — which month or year the whole app is currently
// browsing to. Deliberately not Firestore-synced (it's a navigation
// concern, not user data) and deliberately its own store rather than folded
// into useBudgetStore, whose whole identity is "Firestore-synced data."
// Shared by every page/tab that renders DateFilterTabs, so changing the
// selection in one place is reflected everywhere else — the dashboard's top
// summary row, all 4 tabs, and the standalone /budget /spending /income
// /tax routes all read/write this same state.
interface DateFilterState {
  mode: DateFilterMode
  startDate: Date
  endDate: Date
  setToMonth: (date: Date) => void
  setToYear: (date: Date) => void
}

const initialRange = monthBounds(new Date())

export const useDateFilterStore = create<DateFilterState>((set) => ({
  mode: 'month',
  startDate: initialRange.start,
  endDate: initialRange.end,
  setToMonth: (date) => {
    const { start, end } = monthBounds(date)
    set({ mode: 'month', startDate: start, endDate: end })
  },
  setToYear: (date) => {
    const { start, end } = yearBounds(date)
    set({ mode: 'year', startDate: start, endDate: end })
  },
}))

// Convenience selector — most consumers just want the two dates bundled as
// a DateRange rather than subscribing to startDate/endDate separately.
// Memoized on the underlying Date references (stable between renders unless
// setToMonth/setToYear actually changes them) so consumers can safely put
// the returned object in a useEffect/useMemo dependency array without it
// re-firing on every unrelated re-render.
export function useDateFilterRange(): DateRange {
  const startDate = useDateFilterStore((state) => state.startDate)
  const endDate = useDateFilterStore((state) => state.endDate)
  return useMemo(() => ({ start: startDate, end: endDate }), [startDate, endDate])
}
