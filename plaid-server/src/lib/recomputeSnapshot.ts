import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../firebaseAdmin'
import type { FirestorePlaidTransactionDoc, PeriodSnapshotDoc } from '../types'

function monthId(dateStr: string): string {
  return dateStr.slice(0, 7)
}
function yearId(dateStr: string): string {
  return dateStr.slice(0, 4)
}

type PeriodTotals = Pick<PeriodSnapshotDoc, 'totalSpent' | 'totalIncome'>

// Mirrors src/lib/firestore/recomputeSnapshot.ts's sumPeriod exactly, using
// the Admin SDK's query API instead of the client SDK's — same reasoning
// this whole file is a separate copy rather than a shared import (separate
// runtime/tsconfig, matching how types.ts is already duplicated).
async function sumPeriod(uid: string, startDate: string, endDate: string): Promise<PeriodTotals> {
  const usersRef = db.collection('users').doc(uid)
  const [purchasesSnap, paychecksSnap, transactionsSnap] = await Promise.all([
    usersRef.collection('purchases').where('date', '>=', startDate).where('date', '<=', endDate).get(),
    usersRef.collection('paychecks').where('date', '>=', startDate).where('date', '<=', endDate).get(),
    usersRef
      .collection('plaidTransactions')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get(),
  ])

  const purchaseTotal = purchasesSnap.docs.reduce((sum, d) => sum + (d.data().amount as number), 0)
  const paycheckTotal = paychecksSnap.docs.reduce((sum, d) => sum + (d.data().amount as number), 0)

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

// Recomputes and persists totalSpent/totalIncome for whichever month+year
// `dateStr` falls into — full requery-and-overwrite, not an incremental
// delta (see the frontend's copy of this file for the full reasoning: it's
// self-healing under races and needs no special-casing for `modified`/
// `removed` Plaid transactions). Called after every plaid-server write that
// could affect a period.
export async function recomputeSnapshot(uid: string, dateStr: string): Promise<void> {
  const mId = monthId(dateStr)
  const yId = yearId(dateStr)

  const [monthTotals, yearTotals] = await Promise.all([
    sumPeriod(uid, `${mId}-01`, `${mId}-31`),
    sumPeriod(uid, `${yId}-01-01`, `${yId}-12-31`),
  ])

  const usersRef = db.collection('users').doc(uid)
  await Promise.all([
    usersRef
      .collection('monthlySnapshots')
      .doc(mId)
      .set({ ...monthTotals, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
    usersRef
      .collection('yearlySnapshots')
      .doc(yId)
      .set({ ...yearTotals, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
  ])
}

// A single sync can touch many distinct dates (added/modified/removed
// transactions spanning months of history on a first-ever sync). Dedupe by
// month before recomputing, same reasoning as the frontend's copy.
export async function recomputeSnapshotsForDates(uid: string, dates: string[]): Promise<void> {
  const representativeDateByMonth = new Map<string, string>()
  for (const date of dates) {
    representativeDateByMonth.set(monthId(date), date)
  }
  await Promise.all(
    Array.from(representativeDateByMonth.values()).map((date) => recomputeSnapshot(uid, date))
  )
}
