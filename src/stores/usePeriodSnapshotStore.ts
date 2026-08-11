import { create } from 'zustand'
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useDateFilterStore } from './useDateFilterStore'
import type { DateFilterMode } from '@/lib/period'
import type { PeriodSnapshotDoc } from '@/lib/firestore/types'

interface PeriodSnapshotState {
  totalSpent: number
  totalIncome: number
  bankBalance?: number
  bankBalanceAsOf?: string
  // True until the currently-selected period's snapshot doc has reported at
  // least once (or been confirmed absent) — distinct from useBudgetStore's
  // own `loading`, which tracks its 6 fixed per-user listeners, not this
  // single listener that re-targets itself as the date filter changes.
  loading: boolean
  // Called only from useAuthStore's onAuthStateChanged listener, mirroring
  // useBudgetStore.startSync/stopSync — not meant to be called from UI code.
  start: (uid: string) => void
  stop: () => void
}

const emptyValues = {
  totalSpent: 0,
  totalIncome: 0,
  bankBalance: undefined as number | undefined,
  bankBalanceAsOf: undefined as string | undefined,
}

// One doc per calendar month (monthlySnapshots/{YYYY-MM}) or calendar year
// (yearlySnapshots/{YYYY}) — see src/lib/firestore/recomputeSnapshot.ts,
// which is what actually writes these.
function periodDocRef(uid: string, mode: DateFilterMode, startDate: Date) {
  const year = startDate.getFullYear()
  if (mode === 'month') {
    const month = String(startDate.getMonth() + 1).padStart(2, '0')
    return doc(db, 'users', uid, 'monthlySnapshots', `${year}-${month}`)
  }
  return doc(db, 'users', uid, 'yearlySnapshots', String(year))
}

// Kept outside the Zustand state itself, mirroring useBudgetStore's own
// unsubscribers — these aren't something a component needs to read/react to.
let uid: string | undefined
let unsubscribeDoc: Unsubscribe | undefined
let unsubscribeDateFilter: (() => void) | undefined

// Re-targets the single active onSnapshot listener at whichever period the
// shared date filter currently points to — one listener at a time (not one
// per component that wants this data), matching the "one-writer, fan out
// via the store" pattern useBudgetStore already establishes, just for a
// listener whose target changes at runtime instead of being fixed per user.
function reattach() {
  unsubscribeDoc?.()
  unsubscribeDoc = undefined
  if (!uid) return

  usePeriodSnapshotStore.setState({ ...emptyValues, loading: true })
  const { mode, startDate } = useDateFilterStore.getState()
  unsubscribeDoc = onSnapshot(periodDocRef(uid, mode, startDate), (snapshot) => {
    const data = snapshot.exists() ? (snapshot.data() as PeriodSnapshotDoc) : undefined
    usePeriodSnapshotStore.setState({
      totalSpent: data?.totalSpent ?? 0,
      totalIncome: data?.totalIncome ?? 0,
      bankBalance: data?.bankBalance,
      bankBalanceAsOf: data?.bankBalanceAsOf,
      loading: false,
    })
  })
}

export const usePeriodSnapshotStore = create<PeriodSnapshotState>(() => ({
  ...emptyValues,
  loading: true,

  start: (newUid) => {
    uid = newUid
    unsubscribeDateFilter?.()
    unsubscribeDateFilter = useDateFilterStore.subscribe(reattach)
    reattach()
  },
  stop: () => {
    uid = undefined
    unsubscribeDoc?.()
    unsubscribeDoc = undefined
    unsubscribeDateFilter?.()
    unsubscribeDateFilter = undefined
    usePeriodSnapshotStore.setState({ ...emptyValues, loading: true })
  },
}))
