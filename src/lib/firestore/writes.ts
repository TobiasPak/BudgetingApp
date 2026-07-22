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
