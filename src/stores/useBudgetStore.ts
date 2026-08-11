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
  categorizePlaidTransactionAsSpending,
  categorizePlaidTransactionAsIncome,
  updateCategoryBuckets,
  updateIncomeSourceBuckets,
} from '@/lib/firestore/writes'
import { runAutoCategorizeBackfill } from '@/lib/firestore/autoCategorize'
import type {
  FirestoreCategoryDoc,
  FirestoreIncomeSourceDoc,
  FirestorePaycheckDoc,
  FirestorePurchaseDoc,
} from '@/lib/firestore/types'
import type { BudgetCategory } from '@/types/budget'
import type { Paycheck } from '@/types/paycheck'
import type { PlaidTransaction } from '@/types/plaidTransaction'
import type { Purchase } from '@/types/purchase'
import type { IncomeSource } from '@/types/incomeSource'
import type { Unsubscribe } from 'firebase/firestore'

interface BudgetState {
  categories: BudgetCategory[]
  incomeSources: IncomeSource[]
  paychecks: Paycheck[]
  purchases: Purchase[]
  plaidTransactions: PlaidTransaction[]
  // The last real Plaid-synced balance (plaid-server's syncBalance.ts) —
  // never client-writable, see the removed setBankBalance note below.
  bankBalance: number
  // How many paychecks you expect per month — used to project a monthly
  // dollar target for "percentage of paycheck" budgets even before all of
  // this month's paychecks have actually been logged.
  paychecksPerMonth: number
  // True once the user has completed a real Plaid Link connection — drives
  // ConnectBankButton's "Connect a bank" vs "Sync now" branch, and gates
  // the sign-in auto-sync in useAuthStore.ts. Set server-side only, by
  // plaid-server (see FirestoreUserDoc.hasLinkedBank).
  hasLinkedBank: boolean
  // True until every Firestore collection for the signed-in user has
  // reported at least one snapshot. False (and all fields back to their
  // empty defaults) while signed out.
  loading: boolean
  error: string | null
  addCategory: (category: FirestoreCategoryDoc) => void
  removeCategory: (id: string) => void
  // The only editable field on a category — see BudgetCategoryBase.
  // autoCategorizeBuckets (src/types/budget.ts).
  setCategoryBuckets: (id: string, buckets: string[]) => void
  addIncomeSource: (source: FirestoreIncomeSourceDoc) => void
  removeIncomeSource: (id: string) => void
  setIncomeSourceBuckets: (id: string, buckets: string[]) => void
  addPaycheck: (paycheck: FirestorePaycheckDoc) => void
  // Takes the paycheck's own date (not just its id) so the affected period's
  // snapshot can be recomputed — see src/lib/firestore/recomputeSnapshot.ts.
  removePaycheck: (id: string, date: string) => void
  addPurchase: (purchase: FirestorePurchaseDoc) => void
  removePurchase: (id: string, date: string) => void
  setPaychecksPerMonth: (count: number) => void
  // Turns a raw, uncategorized bank transaction into a real Purchase/
  // Paycheck — see categorizePlaidTransactionAsSpending/AsIncome in
  // src/lib/firestore/writes.ts for what this actually does.
  categorizeTransactionAsSpending: (
    transactionId: string,
    categoryId: string,
    purchase: { date: string; description: string; amount: number }
  ) => void
  categorizeTransactionAsIncome: (
    transactionId: string,
    sourceId: string,
    paycheck: { date: string; amount: number }
  ) => void
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
  plaidTransactions: [] as PlaidTransaction[],
  bankBalance: 0,
  paychecksPerMonth: 2,
  hasLinkedBank: false,
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

// Sweeps currently-uncategorized transactions whenever a category/source
// gains a non-empty bucket mapping (create or edit) — skipped when buckets
// is empty/undefined, since that can never produce a match. See
// runAutoCategorizeBackfill's own doc comment for why it always requeries
// the full current category/source set rather than just the one that
// changed.
function maybeBackfill(uid: string, buckets: string[] | undefined) {
  if (buckets && buckets.length > 0) {
    return runAutoCategorizeBackfill(uid)
  }
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
    writeCategory(uid, category)
      .then(() => maybeBackfill(uid, category.autoCategorizeBuckets))
      .catch((e) => reportWriteError('add category', e))
  },
  removeCategory: (id) => {
    const uid = requireUid()
    if (!uid) return
    deleteCategory(uid, id).catch((e) => reportWriteError('delete category', e))
  },
  setCategoryBuckets: (id, buckets) => {
    const uid = requireUid()
    if (!uid) return
    updateCategoryBuckets(uid, id, buckets)
      .then(() => maybeBackfill(uid, buckets))
      .catch((e) => reportWriteError('update category', e))
  },
  addIncomeSource: (source) => {
    const uid = requireUid()
    if (!uid) return
    writeIncomeSource(uid, source)
      .then(() => maybeBackfill(uid, source.autoCategorizeBuckets))
      .catch((e) => reportWriteError('add income source', e))
  },
  removeIncomeSource: (id) => {
    const uid = requireUid()
    if (!uid) return
    deleteIncomeSource(uid, id).catch((e) =>
      reportWriteError('delete income source', e)
    )
  },
  setIncomeSourceBuckets: (id, buckets) => {
    const uid = requireUid()
    if (!uid) return
    updateIncomeSourceBuckets(uid, id, buckets)
      .then(() => maybeBackfill(uid, buckets))
      .catch((e) => reportWriteError('update income source', e))
  },
  addPaycheck: (paycheck) => {
    const uid = requireUid()
    if (!uid) return
    writePaycheck(uid, paycheck).catch((e) => reportWriteError('add paycheck', e))
  },
  removePaycheck: (id, date) => {
    const uid = requireUid()
    if (!uid) return
    deletePaycheck(uid, id, date).catch((e) => reportWriteError('remove paycheck', e))
  },
  addPurchase: (purchase) => {
    const uid = requireUid()
    if (!uid) return
    writePurchase(uid, purchase).catch((e) => reportWriteError('add purchase', e))
  },
  removePurchase: (id, date) => {
    const uid = requireUid()
    if (!uid) return
    deletePurchase(uid, id, date).catch((e) => reportWriteError('remove purchase', e))
  },
  setPaychecksPerMonth: (count) => {
    const uid = requireUid()
    if (!uid) return
    writeUserFields(uid, { paychecksPerMonth: count }).catch((e) =>
      reportWriteError('update paychecks per month', e)
    )
  },
  categorizeTransactionAsSpending: (transactionId, categoryId, purchase) => {
    const uid = requireUid()
    if (!uid) return
    categorizePlaidTransactionAsSpending(uid, transactionId, categoryId, purchase).catch(
      (e) => reportWriteError('categorize transaction', e)
    )
  },
  categorizeTransactionAsIncome: (transactionId, sourceId, paycheck) => {
    const uid = requireUid()
    if (!uid) return
    categorizePlaidTransactionAsIncome(uid, transactionId, sourceId, paycheck).catch(
      (e) => reportWriteError('categorize transaction', e)
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
      onPlaidTransactions: (plaidTransactions) => set({ plaidTransactions }),
      onUserDoc: (data) =>
        set({
          bankBalance: data.bankBalance,
          paychecksPerMonth: data.paychecksPerMonth,
          hasLinkedBank: data.hasLinkedBank ?? false,
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
