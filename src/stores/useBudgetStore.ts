import { create } from 'zustand'
import { toast } from 'sonner'
import { getFirebaseAuth } from '@/lib/firebase'
import { attachListeners } from '@/lib/firestore/sync'
import {
  writeCategory,
  deleteCategory,
  writeIncomeSource,
  deleteIncomeSource,
  writePaycheck,
  deletePaycheck,
  writePurchase,
  deletePurchase,
  writeUserFields,
} from '@/lib/firestore/writes'
import type {
  FirestoreCategoryDoc,
  FirestoreIncomeSourceDoc,
  FirestorePaycheckDoc,
  FirestorePurchaseDoc,
} from '@/lib/firestore/types'
import type { BudgetCategory } from '@/types/budget'
import type { Paycheck } from '@/types/paycheck'
import type { Purchase } from '@/types/purchase'
import type { IncomeSource } from '@/types/incomeSource'
import type { Unsubscribe } from 'firebase/firestore'

interface BudgetState {
  categories: BudgetCategory[]
  incomeSources: IncomeSource[]
  paychecks: Paycheck[]
  purchases: Purchase[]
  bankBalance: number
  // How many paychecks you expect per month — used to project a monthly
  // dollar target for "percentage of paycheck" budgets even before all of
  // this month's paychecks have actually been logged.
  paychecksPerMonth: number
  // True until every Firestore collection for the signed-in user has
  // reported at least one snapshot. False (and all fields back to their
  // empty defaults) while signed out.
  loading: boolean
  error: string | null
  addCategory: (category: FirestoreCategoryDoc) => void
  removeCategory: (id: string) => void
  addIncomeSource: (source: FirestoreIncomeSourceDoc) => void
  removeIncomeSource: (id: string) => void
  addPaycheck: (paycheck: FirestorePaycheckDoc) => void
  removePaycheck: (id: string) => void
  addPurchase: (purchase: FirestorePurchaseDoc) => void
  removePurchase: (id: string) => void
  setBankBalance: (amount: number) => void
  setPaychecksPerMonth: (count: number) => void
  // Called only from useAuthStore's onAuthStateChanged listener — not meant
  // to be called directly by UI code.
  startSync: (uid: string) => void
  stopSync: () => void
}

const emptyState = {
  categories: [] as BudgetCategory[],
  incomeSources: [] as IncomeSource[],
  paychecks: [] as Paycheck[],
  purchases: [] as Purchase[],
  bankBalance: 0,
  paychecksPerMonth: 2,
}

// Kept outside the Zustand state itself (unsubscribe functions aren't
// something any component needs to read/react to) rather than polluting
// the store's type/re-render surface.
let unsubscribers: Unsubscribe[] = []

// Every add*/remove*/set* action below needs to know which user to write
// to. Reading it directly off the Auth SDK (rather than importing
// useAuthStore) keeps the dependency graph one-directional — useAuthStore
// imports useBudgetStore to drive startSync/stopSync, so the reverse import
// would be circular. Actions are only ever invoked from behind the
// RequireAuth route guard, so a signed-in uid is always available here.
function requireUid(): string | undefined {
  const uid = getFirebaseAuth().currentUser?.uid
  if (!uid) {
    toast.error('Not signed in')
  }
  return uid
}

function reportWriteError(action: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  toast.error(`Couldn't ${action}`, { description: message })
  useBudgetStore.setState({ error: message })
}

export const useBudgetStore = create<BudgetState>((set) => ({
  ...emptyState,
  loading: true,
  error: null,

  addCategory: (category) => {
    const uid = requireUid()
    if (!uid) return
    writeCategory(uid, category).catch((e) => reportWriteError('add category', e))
  },
  removeCategory: (id) => {
    const uid = requireUid()
    if (!uid) return
    deleteCategory(uid, id).catch((e) => reportWriteError('delete category', e))
  },
  addIncomeSource: (source) => {
    const uid = requireUid()
    if (!uid) return
    writeIncomeSource(uid, source).catch((e) =>
      reportWriteError('add income source', e)
    )
  },
  removeIncomeSource: (id) => {
    const uid = requireUid()
    if (!uid) return
    deleteIncomeSource(uid, id).catch((e) =>
      reportWriteError('delete income source', e)
    )
  },
  addPaycheck: (paycheck) => {
    const uid = requireUid()
    if (!uid) return
    writePaycheck(uid, paycheck).catch((e) => reportWriteError('add paycheck', e))
  },
  removePaycheck: (id) => {
    const uid = requireUid()
    if (!uid) return
    deletePaycheck(uid, id).catch((e) => reportWriteError('remove paycheck', e))
  },
  addPurchase: (purchase) => {
    const uid = requireUid()
    if (!uid) return
    writePurchase(uid, purchase).catch((e) => reportWriteError('add purchase', e))
  },
  removePurchase: (id) => {
    const uid = requireUid()
    if (!uid) return
    deletePurchase(uid, id).catch((e) => reportWriteError('remove purchase', e))
  },
  setBankBalance: (amount) => {
    const uid = requireUid()
    if (!uid) return
    writeUserFields(uid, { bankBalance: amount }).catch((e) =>
      reportWriteError('update bank balance', e)
    )
  },
  setPaychecksPerMonth: (count) => {
    const uid = requireUid()
    if (!uid) return
    writeUserFields(uid, { paychecksPerMonth: count }).catch((e) =>
      reportWriteError('update paychecks per month', e)
    )
  },

  startSync: (uid) => {
    unsubscribers.forEach((unsub) => unsub())
    set({ ...emptyState, loading: true, error: null })
    unsubscribers = attachListeners(uid, {
      onCategories: (categories) => set({ categories }),
      onIncomeSources: (incomeSources) => set({ incomeSources }),
      onPaychecks: (paychecks) => set({ paychecks }),
      onPurchases: (purchases) => set({ purchases }),
      onUserDoc: (data) =>
        set({
          bankBalance: data.bankBalance,
          paychecksPerMonth: data.paychecksPerMonth,
        }),
      onReady: () => set({ loading: false }),
    })
  },
  stopSync: () => {
    unsubscribers.forEach((unsub) => unsub())
    unsubscribers = []
    set({ ...emptyState, loading: true, error: null })
  },
}))
