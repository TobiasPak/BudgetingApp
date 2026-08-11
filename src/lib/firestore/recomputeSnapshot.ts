import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { FirestorePaycheckDoc, FirestorePlaidTransactionDoc, FirestorePurchaseDoc } from './types'

function monthId(dateStr: string): string {
  return dateStr.slice(0, 7)
}
function yearId(dateStr: string): string {
  return dateStr.slice(0, 4)
}

interface PeriodTotals {
  totalSpent: number
  totalIncome: number
}

// Same summation this app's screens used to compute live on the client
// (filtering Purchase/Paycheck/PlaidTransaction arrays down to a range), just
// run as real Firestore range queries against one specific [startDate,
// endDate] window instead — startDate/endDate are plain "YYYY-MM-DD"
// strings, which compare correctly with Firestore's own </> operators (same
// lexicographic-ISO-string convention src/lib/period.ts already relies on),
// so no Date/timezone handling is needed here at all.
async function sumPeriod(uid: string, startDate: string, endDate: string): Promise<PeriodTotals> {
  const [purchasesSnap, paychecksSnap, transactionsSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'users', uid, 'purchases'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      )
    ),
    getDocs(
      query(
        collection(db, 'users', uid, 'paychecks'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      )
    ),
    getDocs(
      query(
        collection(db, 'users', uid, 'plaidTransactions'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      )
    ),
  ])

  const purchaseTotal = purchasesSnap.docs.reduce(
    (sum, d) => sum + (d.data() as FirestorePurchaseDoc).amount,
    0
  )
  const paycheckTotal = paychecksSnap.docs.reduce(
    (sum, d) => sum + (d.data() as FirestorePaycheckDoc).amount,
    0
  )

  // Mirrors isPlaidTransactionCategorized (src/types/plaidTransaction.ts):
  // a categorized transaction already has a corresponding Purchase/Paycheck
  // counted above, so counting it here too would double it.
  let uncategorizedSpending = 0
  let uncategorizedIncome = 0
  for (const d of transactionsSnap.docs) {
    const t = d.data() as FirestorePlaidTransactionDoc
    if (t.categoryId || t.sourceId) continue
    if (t.transactionType === 'spending') uncategorizedSpending += t.amount
    else if (t.transactionType === 'income') uncategorizedIncome += t.amount
  }

  return {
    totalSpent: purchaseTotal + uncategorizedSpending,
    totalIncome: paycheckTotal + uncategorizedIncome,
  }
}

// Recomputes and persists the totalSpent/totalIncome for whichever month AND
// year `dateStr` falls into, overwriting both snapshot docs from scratch —
// not an incremental delta. A full requery can't drift out of sync and needs
// no special-casing for categorization, edits, or deletes: whichever write
// finishes last always leaves the period's real, correct total behind. Cost
// is negligible at this app's personal scale (tens of records per period,
// not thousands). Called after every write in writes.ts that could affect a
// period's totals; plaid-server keeps its own copy of this same logic
// (plaid-server/src/lib/recomputeSnapshot.ts) for Plaid-driven writes, since
// it's a separate runtime/SDK.
export async function recomputeSnapshot(uid: string, dateStr: string): Promise<void> {
  const mId = monthId(dateStr)
  const yId = yearId(dateStr)

  // '-31'/'-12-31' are safe upper bounds even for shorter months — ISO date
  // strings compare lexicographically, so e.g. "2026-02-29" < "2026-02-31"
  // holds even though Feb never reaches the 31st, and "2026-02-31" is still
  // always < "2026-03-01".
  const [monthTotals, yearTotals] = await Promise.all([
    sumPeriod(uid, `${mId}-01`, `${mId}-31`),
    sumPeriod(uid, `${yId}-01-01`, `${yId}-12-31`),
  ])

  await Promise.all([
    setDoc(
      doc(db, 'users', uid, 'monthlySnapshots', mId),
      { ...monthTotals, updatedAt: serverTimestamp() },
      { merge: true }
    ),
    setDoc(
      doc(db, 'users', uid, 'yearlySnapshots', yId),
      { ...yearTotals, updatedAt: serverTimestamp() },
      { merge: true }
    ),
  ])
}

// A single write can span many distinct dates (a cascading category/source
// delete spanning months of purchase history). Dedupe by month before
// recomputing — recomputing once for any date within a given month already
// recomputes that whole month (and its year) correctly, so calling this once
// per raw date would just be redundant requerying, not more correct.
export async function recomputeSnapshotsForDates(uid: string, dates: string[]): Promise<void> {
  const representativeDateByMonth = new Map<string, string>()
  for (const date of dates) {
    representativeDateByMonth.set(monthId(date), date)
  }
  await Promise.all(
    Array.from(representativeDateByMonth.values()).map((date) => recomputeSnapshot(uid, date))
  )
}
