import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  FirestoreCategoryDoc,
  FirestoreIncomeSourceDoc,
  FirestorePaycheckDoc,
  FirestorePlaidTransactionDoc,
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

export function writePaycheck(uid: string, paycheck: FirestorePaycheckDoc) {
  return setDoc(doc(collection(db, 'users', uid, 'paychecks')), {
    ...paycheck,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function deletePaycheck(uid: string, id: string) {
  return deleteDoc(doc(db, 'users', uid, 'paychecks', id))
}

export function writePurchase(uid: string, purchase: FirestorePurchaseDoc) {
  return setDoc(doc(collection(db, 'users', uid, 'purchases')), {
    ...purchase,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function deletePurchase(uid: string, id: string) {
  return deleteDoc(doc(db, 'users', uid, 'purchases', id))
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
  purchasesToDelete.forEach((purchaseDoc) => batch.delete(purchaseDoc.ref))
  batch.delete(doc(db, 'users', uid, 'categories', categoryId))
  return batch.commit()
}

export async function deleteIncomeSource(uid: string, sourceId: string) {
  const paychecksToDelete = await getDocs(
    query(
      collection(db, 'users', uid, 'paychecks'),
      where('sourceId', '==', sourceId)
    )
  )
  const batch = writeBatch(db)
  paychecksToDelete.forEach((paycheckDoc) => batch.delete(paycheckDoc.ref))
  batch.delete(doc(db, 'users', uid, 'incomeSources', sourceId))
  return batch.commit()
}

// Inserts one raw bank transaction, uncategorized. Called by the (not yet
// built) Plaid sync process in real usage — for now, only
// src/lib/firestore/plaidDemoData.ts's "Simulate bank sync" seeding calls
// this. In a real sync, the caller should set the Firestore doc id to
// Plaid's own transaction_id (via setDoc(doc(db, ..., plaidTransactionId))
// instead of an auto-id) so re-syncing the same transaction naturally
// dedups instead of creating a duplicate — not needed for the demo seed,
// which never re-syncs the same fake data twice.
export function writePlaidTransaction(
  uid: string,
  transaction: FirestorePlaidTransactionDoc
) {
  return setDoc(doc(collection(db, 'users', uid, 'plaidTransactions')), {
    ...transaction,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// Categorizing a Plaid transaction creates a REAL Purchase/Paycheck doc
// from it (so it counts toward budget/income totals exactly like a
// manually-entered one — getCategorySpent/getIncomeInRange never need to
// know Plaid exists, since they just query the same purchases/paychecks
// collections either way) and marks the source transaction as resolved in
// the same batch, so it's never offered for (re-)categorization again.
// Today this is only ever called from a manual "Categorize as…" control in
// the UI; the not-yet-built AI agent would call the equivalent operation
// server-side from a Cloud Function instead (see functions/src/index.ts).
export async function categorizePlaidTransactionAsSpending(
  uid: string,
  transactionId: string,
  categoryId: string,
  purchase: { date: string; description: string; amount: number }
) {
  const batch = writeBatch(db)
  const purchaseRef = doc(collection(db, 'users', uid, 'purchases'))
  batch.set(purchaseRef, {
    categoryId,
    ...purchase,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.update(doc(db, 'users', uid, 'plaidTransactions', transactionId), {
    categoryId,
    purchaseId: purchaseRef.id,
    updatedAt: serverTimestamp(),
  })
  return batch.commit()
}

export async function categorizePlaidTransactionAsIncome(
  uid: string,
  transactionId: string,
  sourceId: string,
  paycheck: { date: string; amount: number }
) {
  const batch = writeBatch(db)
  const paycheckRef = doc(collection(db, 'users', uid, 'paychecks'))
  batch.set(paycheckRef, {
    sourceId,
    ...paycheck,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.update(doc(db, 'users', uid, 'plaidTransactions', transactionId), {
    sourceId,
    paycheckId: paycheckRef.id,
    updatedAt: serverTimestamp(),
  })
  return batch.commit()
}
