import { Router } from 'express'
import { FieldValue } from 'firebase-admin/firestore'
import { plaidClient } from '../plaidClient'
import { requireAuth } from '../middleware/requireAuth'
import { db } from '../firebaseAdmin'
import type { FirestorePlaidTransactionDoc, PlaidItemDoc, PlaidTransactionType } from '../types'

export const syncTransactionsRouter = Router()

// Plaid's own transaction shape doesn't have a single "type" field the way
// our app's model does — derive one. Transfers surface under Plaid's
// personal_finance_category as TRANSFER_IN/TRANSFER_OUT; anything else
// falls back to the sign of `amount` (Plaid: positive = money out of the
// account = spending, negative = money in = income).
function deriveTransactionType(amount: number, personalFinanceCategory?: string): PlaidTransactionType {
  if (personalFinanceCategory === 'TRANSFER_IN' || personalFinanceCategory === 'TRANSFER_OUT') {
    return 'transfer'
  }
  return amount > 0 ? 'spending' : 'income'
}

// POST /api/sync_transactions — called on-demand by the frontend (e.g. once
// per sign-in), NOT on a timer or continuously. Syncs every Plaid item
// linked to the calling user, using each item's stored cursor so only
// what's changed since the last sync is fetched — see the design note this
// implements in the conversation this was built from.
syncTransactionsRouter.post('/sync_transactions', requireAuth, async (req, res) => {
  try {
    const itemsSnapshot = await db.collection('users').doc(req.uid).collection('plaidItems').get()

    let totalSynced = 0
    for (const itemDoc of itemsSnapshot.docs) {
      const item = itemDoc.data() as PlaidItemDoc
      totalSynced += await syncOneItem(req.uid, item)
    }

    res.json({ syncedCount: totalSynced })
  } catch (error) {
    console.error('sync_transactions failed', error)
    res.status(502).json({ error: 'Failed to sync transactions from Plaid' })
  }
})

async function syncOneItem(uid: string, item: PlaidItemDoc): Promise<number> {
  let cursor = item.cursor
  let hasMore = true
  let syncedCount = 0

  const transactionsRef = db.collection('users').doc(uid).collection('plaidTransactions')

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: item.accessToken,
      cursor,
    })
    const { added, modified, has_more, next_cursor } = response.data

    const batch = db.batch()
    // Plaid's own transaction_id is the doc id — re-syncing a modified
    // transaction (e.g. pending -> posted) overwrites the same doc instead
    // of creating a duplicate. `added` vs `modified` get different field
    // sets on purpose: only a genuinely new doc gets createdAt set: a
    // `set(..., {merge: true})` that included createdAt: serverTimestamp()
    // on every write would silently overwrite the original createdAt each
    // time an existing transaction is re-synced.
    for (const transaction of added) {
      const doc: FirestorePlaidTransactionDoc = {
        accountName: item.institutionName ?? transaction.account_id,
        amount: Math.abs(transaction.amount),
        date: transaction.date,
        merchantName: transaction.merchant_name ?? transaction.name,
        plaidCategory: transaction.personal_finance_category?.detailed ?? transaction.category?.join(' > ') ?? 'Uncategorized',
        transactionType: deriveTransactionType(transaction.amount, transaction.personal_finance_category?.primary),
        pending: transaction.pending,
      }
      batch.set(transactionsRef.doc(transaction.transaction_id), {
        ...doc,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
    for (const transaction of modified) {
      const doc: FirestorePlaidTransactionDoc = {
        accountName: item.institutionName ?? transaction.account_id,
        amount: Math.abs(transaction.amount),
        date: transaction.date,
        merchantName: transaction.merchant_name ?? transaction.name,
        plaidCategory: transaction.personal_finance_category?.detailed ?? transaction.category?.join(' > ') ?? 'Uncategorized',
        transactionType: deriveTransactionType(transaction.amount, transaction.personal_finance_category?.primary),
        pending: transaction.pending,
      }
      batch.set(
        transactionsRef.doc(transaction.transaction_id),
        { ...doc, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      )
    }
    await batch.commit()

    syncedCount += added.length + modified.length
    cursor = next_cursor
    hasMore = has_more
  }

  await db
    .collection('users')
    .doc(uid)
    .collection('plaidItems')
    .doc(item.itemId)
    .update({ cursor })

  return syncedCount
}
