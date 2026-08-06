import {
  collection,
  doc,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getIcon } from '@/lib/iconMap'
import type { BudgetCategory } from '@/types/budget'
import type { IncomeSource } from '@/types/incomeSource'
import type { Paycheck } from '@/types/paycheck'
import type { PlaidTransaction } from '@/types/plaidTransaction'
import type { Purchase } from '@/types/purchase'
import type {
  FirestoreCategoryDoc,
  FirestoreIncomeSourceDoc,
  FirestorePaycheckDoc,
  FirestorePlaidTransactionDoc,
  FirestorePurchaseDoc,
  FirestoreUserDoc,
} from './types'

// Converts a Firestore Timestamp to an ISO datetime string for the
// in-memory types. Docs written before createdAt/updatedAt existed have no
// value here — returns undefined rather than fabricating one.
function timestampToIso(ts: Timestamp | undefined): string | undefined {
  return ts?.toDate().toISOString()
}

interface SyncCallbacks {
  onCategories: (categories: BudgetCategory[]) => void
  onIncomeSources: (sources: IncomeSource[]) => void
  onPaychecks: (paychecks: Paycheck[]) => void
  onPurchases: (purchases: Purchase[]) => void
  onPlaidTransactions: (transactions: PlaidTransaction[]) => void
  onUserDoc: (data: FirestoreUserDoc) => void
  // Called exactly once, after every listener below has reported at least
  // one snapshot — lets the store flip `loading` to false only once all of
  // a user's data has actually arrived, not just the first collection.
  onReady: () => void
}

function categoryDocToCategory(id: string, data: FirestoreCategoryDoc): BudgetCategory {
  const base = {
    id,
    name: data.name,
    icon: getIcon(data.iconName),
    color: data.color,
    isCustom: data.isCustom,
    resetDay: data.resetDay,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  }
  return data.type === 'fixed'
    ? { ...base, type: 'fixed', monthlyAmount: data.monthlyAmount }
    : { ...base, type: 'percentage', percent: data.percent, basis: data.basis }
}

function incomeSourceDocToSource(id: string, data: FirestoreIncomeSourceDoc): IncomeSource {
  return {
    id,
    name: data.name,
    icon: getIcon(data.iconName),
    color: data.color,
    isCustom: data.isCustom,
    // Docs written before incomeType existed have no value here. Default to
    // 'selfEmployed' rather than 'w2' — treating unclassified income as
    // self-employment risks overstating tax owed, treating it as W-2 risks
    // silently understating it (missing SE tax entirely). The former is the
    // safer failure mode for a tax estimate.
    incomeType: data.incomeType ?? 'selfEmployed',
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  }
}

function paycheckDocToPaycheck(id: string, data: FirestorePaycheckDoc): Paycheck {
  return {
    id,
    amount: data.amount,
    date: data.date,
    sourceId: data.sourceId,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  }
}

function purchaseDocToPurchase(id: string, data: FirestorePurchaseDoc): Purchase {
  return {
    id,
    categoryId: data.categoryId,
    date: data.date,
    description: data.description,
    amount: data.amount,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  }
}

function plaidTransactionDocToTransaction(
  id: string,
  data: FirestorePlaidTransactionDoc
): PlaidTransaction {
  return {
    id,
    accountName: data.accountName,
    amount: data.amount,
    date: data.date,
    authorizedDate: data.authorizedDate,
    merchantName: data.merchantName,
    logoUrl: data.logoUrl,
    plaidCategory: data.plaidCategory,
    plaidCategoryPrimary: data.plaidCategoryPrimary,
    transactionType: data.transactionType,
    pending: data.pending,
    raw: data.raw,
    categoryId: data.categoryId,
    purchaseId: data.purchaseId,
    sourceId: data.sourceId,
    paycheckId: data.paycheckId,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  }
}

export function attachListeners(uid: string, callbacks: SyncCallbacks): Unsubscribe[] {
  const fired = {
    categories: false,
    incomeSources: false,
    paychecks: false,
    purchases: false,
    plaidTransactions: false,
    user: false,
  }
  function markFired(key: keyof typeof fired) {
    if (fired[key]) return
    fired[key] = true
    if (Object.values(fired).every(Boolean)) callbacks.onReady()
  }

  const userRef = doc(db, 'users', uid)
  const categoriesRef = collection(db, 'users', uid, 'categories')
  const incomeSourcesRef = collection(db, 'users', uid, 'incomeSources')
  const paychecksRef = collection(db, 'users', uid, 'paychecks')
  const purchasesRef = collection(db, 'users', uid, 'purchases')
  const plaidTransactionsRef = collection(db, 'users', uid, 'plaidTransactions')

  return [
    onSnapshot(userRef, (snapshot) => {
      const data = snapshot.exists()
        ? (snapshot.data() as FirestoreUserDoc)
        : { bankBalance: 0, paychecksPerMonth: 2, hasLinkedBank: false }
      callbacks.onUserDoc(data)
      markFired('user')
    }),
    onSnapshot(categoriesRef, (snapshot) => {
      callbacks.onCategories(
        snapshot.docs.map((d) =>
          categoryDocToCategory(d.id, d.data() as FirestoreCategoryDoc)
        )
      )
      markFired('categories')
    }),
    onSnapshot(incomeSourcesRef, (snapshot) => {
      callbacks.onIncomeSources(
        snapshot.docs.map((d) =>
          incomeSourceDocToSource(d.id, d.data() as FirestoreIncomeSourceDoc)
        )
      )
      markFired('incomeSources')
    }),
    onSnapshot(paychecksRef, (snapshot) => {
      callbacks.onPaychecks(
        snapshot.docs.map((d) =>
          paycheckDocToPaycheck(d.id, d.data() as FirestorePaycheckDoc)
        )
      )
      markFired('paychecks')
    }),
    onSnapshot(purchasesRef, (snapshot) => {
      callbacks.onPurchases(
        snapshot.docs.map((d) =>
          purchaseDocToPurchase(d.id, d.data() as FirestorePurchaseDoc)
        )
      )
      markFired('purchases')
    }),
    onSnapshot(plaidTransactionsRef, (snapshot) => {
      callbacks.onPlaidTransactions(
        snapshot.docs.map((d) =>
          plaidTransactionDocToTransaction(
            d.id,
            d.data() as FirestorePlaidTransactionDoc
          )
        )
      )
      markFired('plaidTransactions')
    }),
  ]
}
