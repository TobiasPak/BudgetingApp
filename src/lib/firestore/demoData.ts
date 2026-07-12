import { collection, doc, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  demoCategories,
  demoIncomeSources,
  demoPaychecks,
  demoPurchases,
  demoBankBalance,
  demoPaychecksPerMonth,
} from '@/lib/demoData'

// Seeds the app's demo dataset into a signed-in user's own Firestore
// documents — ~40 writes total (9 categories + 5 income sources + 6
// paychecks + 19 purchases + 1 user-doc update), well under a single
// batch's 500-operation limit, so one writeBatch is enough. Categories and
// income sources keep their fixed ids (matching demoData.ts) so
// paychecks'/purchases' sourceId/categoryId references resolve correctly;
// paychecks and purchases themselves get normal auto-generated ids since
// nothing references them by id.
export async function loadDemoData(uid: string): Promise<void> {
  const batch = writeBatch(db)

  for (const { id, ...data } of demoCategories) {
    batch.set(doc(db, 'users', uid, 'categories', id), data)
  }
  for (const { id, ...data } of demoIncomeSources) {
    batch.set(doc(db, 'users', uid, 'incomeSources', id), data)
  }
  for (const paycheck of demoPaychecks) {
    batch.set(doc(collection(db, 'users', uid, 'paychecks')), paycheck)
  }
  for (const purchase of demoPurchases) {
    batch.set(doc(collection(db, 'users', uid, 'purchases')), purchase)
  }
  batch.set(
    doc(db, 'users', uid),
    { bankBalance: demoBankBalance, paychecksPerMonth: demoPaychecksPerMonth },
    { merge: true }
  )

  await batch.commit()
}
