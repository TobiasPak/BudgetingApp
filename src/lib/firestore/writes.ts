import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore'
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

export function writeCategory(uid: string, category: FirestoreCategoryDoc) {
  return setDoc(doc(collection(db, 'users', uid, 'categories')), category)
}

export function writeIncomeSource(uid: string, source: FirestoreIncomeSourceDoc) {
  return setDoc(doc(collection(db, 'users', uid, 'incomeSources')), source)
}

export function writePaycheck(uid: string, paycheck: FirestorePaycheckDoc) {
  return setDoc(doc(collection(db, 'users', uid, 'paychecks')), paycheck)
}

export function deletePaycheck(uid: string, id: string) {
  return deleteDoc(doc(db, 'users', uid, 'paychecks', id))
}

export function writePurchase(uid: string, purchase: FirestorePurchaseDoc) {
  return setDoc(doc(collection(db, 'users', uid, 'purchases')), purchase)
}

export function deletePurchase(uid: string, id: string) {
  return deleteDoc(doc(db, 'users', uid, 'purchases', id))
}

export function writeUserFields(uid: string, fields: Partial<FirestoreUserDoc>) {
  return setDoc(doc(db, 'users', uid), fields, { merge: true })
}
