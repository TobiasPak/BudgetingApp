import {
  collection,
  deleteField,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { recomputeSnapshot, recomputeSnapshotsForDates } from './recomputeSnapshot'
import type {
  FirestoreCategoryDoc,
  FirestoreIncomeSourceDoc,
  FirestorePaycheckDoc,
  FirestorePurchaseDoc,
  FirestoreUserDoc,
} from './types'

// Every write here targets `users/{uid}/...` — the caller (useBudgetStore)
// is responsible for knowing which uid is signed in and never calling these
// when signed out.
//
// Every create* function below injects createdAt/updatedAt via
// serverTimestamp() itself — callers never supply these. There's no
// update path for any of these 4 entities yet (every "add" is always a
// brand-new document, never an in-place edit), so updatedAt always equals
// createdAt for now; that's expected, not a bug.

export function writeCategory(uid: string, category: FirestoreCategoryDoc) {
  return setDoc(doc(collection(db, 'users', uid, 'categories')), {
    ...category,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function writeIncomeSource(uid: string, source: FirestoreIncomeSourceDoc) {
  return setDoc(doc(collection(db, 'users', uid, 'incomeSources')), {
    ...source,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// The only editable field on either entity today — see BudgetCategoryBase.
// autoCategorizeBuckets / IncomeSource.autoCategorizeBuckets. A plain
// partial updateDoc; firestore.rules' update rule re-validates every other
// existing field is still well-typed (Firestore's update() merges into the
// existing doc, so those fields resolve to their unchanged values).
export function updateCategoryBuckets(uid: string, categoryId: string, buckets: string[]) {
  return updateDoc(doc(db, 'users', uid, 'categories', categoryId), {
    autoCategorizeBuckets: buckets,
    updatedAt: serverTimestamp(),
  })
}

export function updateIncomeSourceBuckets(uid: string, sourceId: string, buckets: string[]) {
  return updateDoc(doc(db, 'users', uid, 'incomeSources', sourceId), {
    autoCategorizeBuckets: buckets,
    updatedAt: serverTimestamp(),
  })
}

export async function writePaycheck(uid: string, paycheck: FirestorePaycheckDoc) {
  await setDoc(doc(collection(db, 'users', uid, 'paychecks')), {
    ...paycheck,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await recomputeSnapshot(uid, paycheck.date)
}

// Takes the record's own date (every call site already has the full
// Paycheck object in hand, not just its id) so the affected period's
// snapshot can be recomputed after the delete — see recomputeSnapshot.ts.
//
// Also un-links any Plaid transaction that points at this paycheck
// (paycheckId == id, set by categorizePlaidTransactionAsIncome). Without
// this, deleting a Plaid-sourced paycheck left the source transaction
// permanently stuck "categorized" — isPlaidTransactionCategorized (and the
// auto-categorize backfill's same check) only look at sourceId/paycheckId
// being *set*, not at whether the paycheck they point to still exists — so
// it would keep showing a source badge in Bank Activity and never be
// offered for (re-)categorization again, manual or automatic. Found via a
// real user report.
export async function deletePaycheck(uid: string, id: string, date: string) {
  const linkedTransactions = await getDocs(
    query(collection(db, 'users', uid, 'plaidTransactions'), where('paycheckId', '==', id))
  )
  const batch = writeBatch(db)
  batch.delete(doc(db, 'users', uid, 'paychecks', id))
  linkedTransactions.docs.forEach((transactionDoc) => {
    batch.update(transactionDoc.ref, {
      sourceId: deleteField(),
      paycheckId: deleteField(),
      updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
  await recomputeSnapshot(uid, date)
}

export async function writePurchase(uid: string, purchase: FirestorePurchaseDoc) {
  await setDoc(doc(collection(db, 'users', uid, 'purchases')), {
    ...purchase,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await recomputeSnapshot(uid, purchase.date)
}

// Same un-linking as deletePaycheck above, for purchases (purchaseId == id).
export async function deletePurchase(uid: string, id: string, date: string) {
  const linkedTransactions = await getDocs(
    query(collection(db, 'users', uid, 'plaidTransactions'), where('purchaseId', '==', id))
  )
  const batch = writeBatch(db)
  batch.delete(doc(db, 'users', uid, 'purchases', id))
  linkedTransactions.docs.forEach((transactionDoc) => {
    batch.update(transactionDoc.ref, {
      categoryId: deleteField(),
      purchaseId: deleteField(),
      updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
  await recomputeSnapshot(uid, date)
}

export function writeUserFields(uid: string, fields: Partial<FirestoreUserDoc>) {
  return setDoc(doc(db, 'users', uid), fields, { merge: true })
}

// Cascading deletes — deleting a category/income source also deletes every
// purchase/paycheck ever logged against it (not just what's in the
// currently-viewed date range), so no orphaned records are left pointing at
// an id that no longer exists. One writeBatch (category doc + its
// purchases, well under the 500-op cap for a personal-scale dataset),
// mirroring the batch pattern already used in demoData.ts.
export async function deleteCategory(uid: string, categoryId: string) {
  const purchasesToDelete = await getDocs(
    query(
      collection(db, 'users', uid, 'purchases'),
      where('categoryId', '==', categoryId)
    )
  )
  const batch = writeBatch(db)
  const dates = purchasesToDelete.docs.map((purchaseDoc) => {
    batch.delete(purchaseDoc.ref)
    return (purchaseDoc.data() as FirestorePurchaseDoc).date
  })
  batch.delete(doc(db, 'users', uid, 'categories', categoryId))
  await batch.commit()
  // The cascade can span many different months/years at once — recompute
  // every distinct period touched, not just one.
  await recomputeSnapshotsForDates(uid, dates)
}

export async function deleteIncomeSource(uid: string, sourceId: string) {
  const paychecksToDelete = await getDocs(
    query(
      collection(db, 'users', uid, 'paychecks'),
      where('sourceId', '==', sourceId)
    )
  )
  const batch = writeBatch(db)
  const dates = paychecksToDelete.docs.map((paycheckDoc) => {
    batch.delete(paycheckDoc.ref)
    return (paycheckDoc.data() as FirestorePaycheckDoc).date
  })
  batch.delete(doc(db, 'users', uid, 'incomeSources', sourceId))
  await batch.commit()
  await recomputeSnapshotsForDates(uid, dates)
}

// Categorizing a Plaid transaction creates a REAL Purchase/Paycheck doc
// from it (so it counts toward budget/income totals exactly like a
// manually-entered one — getCategorySpent/getIncomeInRange never need to
// know Plaid exists, since they just query the same purchases/paychecks
// collections either way) and marks the source transaction as resolved in
// the same atomic operation, so it's never offered for (re-)categorization
// again. Called both from the manual "Categorize as…" control in the UI
// and from the auto-categorize backfill sweep (src/lib/firestore/
// autoCategorize.ts) — those two can genuinely race on the same
// transaction (e.g. a user clicks "Categorize…" on a transaction at the
// same moment a backfill sweep, triggered by them saving a category's
// bucket mapping, independently reaches that same transaction). Uses
// runTransaction rather than a plain writeBatch specifically so this is
// race-safe: it re-reads the transaction doc's current categoryId/sourceId
// at commit time and no-ops if something else categorized it first —
// Firestore automatically retries a transaction whose read set changed
// before commit, so of two concurrent callers exactly one wins and the
// other safely skips, instead of both creating a duplicate Purchase/
// Paycheck. Found as a real bug (duplicate items) via user report.
export async function categorizePlaidTransactionAsSpending(
  uid: string,
  transactionId: string,
  categoryId: string,
  purchase: { date: string; description: string; amount: number }
) {
  const transactionRef = doc(db, 'users', uid, 'plaidTransactions', transactionId)
  const purchaseRef = doc(collection(db, 'users', uid, 'purchases'))

  const didCategorize = await runTransaction(db, async (tx) => {
    const transactionSnap = await tx.get(transactionRef)
    const data = transactionSnap.data()
    if (!data || data.categoryId || data.sourceId) return false
    tx.set(purchaseRef, {
      categoryId,
      ...purchase,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    tx.update(transactionRef, {
      categoryId,
      purchaseId: purchaseRef.id,
      updatedAt: serverTimestamp(),
    })
    return true
  })

  // Net change to the period's total is zero either way (moves from the
  // "uncategorized Plaid" bucket to the "real Purchase" bucket), but only
  // recompute when this call actually did something — a no-op race loser
  // changed nothing, and the winner's own call already recomputes.
  if (didCategorize) {
    await recomputeSnapshot(uid, purchase.date)
  }
}

export async function categorizePlaidTransactionAsIncome(
  uid: string,
  transactionId: string,
  sourceId: string,
  paycheck: { date: string; amount: number }
) {
  const transactionRef = doc(db, 'users', uid, 'plaidTransactions', transactionId)
  const paycheckRef = doc(collection(db, 'users', uid, 'paychecks'))

  const didCategorize = await runTransaction(db, async (tx) => {
    const transactionSnap = await tx.get(transactionRef)
    const data = transactionSnap.data()
    if (!data || data.categoryId || data.sourceId) return false
    tx.set(paycheckRef, {
      sourceId,
      ...paycheck,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    tx.update(transactionRef, {
      sourceId,
      paycheckId: paycheckRef.id,
      updatedAt: serverTimestamp(),
    })
    return true
  })

  if (didCategorize) {
    await recomputeSnapshot(uid, paycheck.date)
  }
}
