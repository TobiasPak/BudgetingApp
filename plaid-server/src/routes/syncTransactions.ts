import { Router } from 'express'
import { FieldValue } from 'firebase-admin/firestore'
import type { Transaction } from 'plaid'
import { plaidClient } from '../plaidClient'
import { requireAuth } from '../middleware/requireAuth'
import { db } from '../firebaseAdmin'
import { fetchAccountsMap } from '../lib/plaidAccounts'
import type { FirestorePlaidTransactionDoc, PlaidItemDoc, PlaidTransactionType } from '../types'

export const syncTransactionsRouter = Router()

// Plaid's own transaction shape doesn't have a single "type" field the way
// our app's model does — derive one from personal_finance_category.primary
// (Plaid's ~16-value top-level taxonomy) where it's explicit, falling back
// to the sign of `amount` only when the category itself doesn't say.
// TRANSFER_IN/TRANSFER_OUT = money moved between the user's OWN linked
// accounts (e.g. checking -> savings) — not a third party, so neither
// spending nor income. INCOME = Plaid's own guess that this is a deposit
// like a paycheck; checked explicitly rather than solely inferred from a
// negative amount, since a mis-signed edge case would otherwise silently
// misclassify a paycheck as spending. Plaid: positive amount = money out
// of the account (spending), negative = money in (income) — the
// documented sign convention, used as the tiebreaker for every other
// category (FOOD_AND_DRINK, RENT_AND_UTILITIES, etc., which are always
// spending in practice but don't need their own explicit branch here).
function deriveTransactionType(amount: number, personalFinanceCategory?: string): PlaidTransactionType {
  if (personalFinanceCategory === 'INCOME') {
    return 'income'
  }
  if (personalFinanceCategory === 'TRANSFER_IN' || personalFinanceCategory === 'TRANSFER_OUT') {
    return 'transfer'
  }
  return amount > 0 ? 'spending' : 'income'
}

// account_id alone isn't human-readable — resolve it through item.accounts
// (fetched at link time in exchangeToken.ts, or self-healed below for
// items linked before that field existed) so transactions from different
// accounts under the same institution (e.g. a checking account and a
// credit card) are distinguishable instead of all sharing one
// institution-only label. Falls back to the old behavior when no account
// info is available yet.
function deriveAccountName(item: PlaidItemDoc, transaction: Transaction): string {
  const account = item.accounts?.[transaction.account_id]
  if (!account) {
    return item.institutionName ?? transaction.account_id
  }
  const maskSuffix = account.mask ? ` ...${account.mask}` : ''
  return item.institutionName
    ? `${item.institutionName} ${account.name}${maskSuffix}`
    : `${account.name}${maskSuffix}`
}

// Shared by both the `added` and `modified` write paths below (they used
// to duplicate this construction inline). Saves plaidCategoryPrimary
// (Plaid's coarse ~16-value bucket, e.g. "FOOD_AND_DRINK") separately from
// plaidCategory (the much more granular "detailed" string) specifically so
// a future auto-sort-into-budget-categories feature has a small, stable
// set of values to match against instead of Plaid's full detailed taxonomy.
// `raw` stores the complete Plaid transaction verbatim — see its doc
// comment in types.ts for why (cursor sync means an uncaptured field on an
// unmodified transaction is gone for good).
//
// Every optional field below is added via conditional spread rather than
// `field: value ?? undefined` — Firestore's Admin SDK throws on an
// explicit `undefined` property value (no ignoreUndefinedProperties
// configured), and Plaid genuinely omits authorized_date/logo_url/
// personal_finance_category for plenty of real and sandbox transactions,
// so this isn't a hypothetical edge case.
function buildTransactionDoc(item: PlaidItemDoc, transaction: Transaction): FirestorePlaidTransactionDoc {
  return {
    accountName: deriveAccountName(item, transaction),
    amount: Math.abs(transaction.amount),
    date: transaction.date,
    ...(transaction.authorized_date ? { authorizedDate: transaction.authorized_date } : {}),
    merchantName: transaction.merchant_name ?? transaction.name,
    ...(transaction.logo_url ? { logoUrl: transaction.logo_url } : {}),
    plaidCategory: transaction.personal_finance_category?.detailed ?? transaction.category?.join(' > ') ?? 'Uncategorized',
    ...(transaction.personal_finance_category?.primary
      ? { plaidCategoryPrimary: transaction.personal_finance_category.primary }
      : {}),
    transactionType: deriveTransactionType(transaction.amount, transaction.personal_finance_category?.primary),
    pending: transaction.pending,
    raw: transaction,
  }
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

// Self-healing backfill: items linked before per-account names existed
// have no `accounts` map. Rather than requiring a re-link, fetch it once
// here and persist it back to the item doc — every sync after this one
// (for this item) will already have it. Best-effort: a failure just means
// accountName falls back to the old institution-only label for this pass.
async function ensureAccounts(uid: string, item: PlaidItemDoc): Promise<PlaidItemDoc> {
  if (item.accounts) return item
  try {
    const accounts = await fetchAccountsMap(item.accessToken)
    await db
      .collection('users')
      .doc(uid)
      .collection('plaidItems')
      .doc(item.itemId)
      .update({ accounts })
    return { ...item, accounts }
  } catch (error) {
    console.error('accountsGet self-heal failed during sync_transactions (non-fatal)', error)
    return item
  }
}

async function syncOneItem(uid: string, item: PlaidItemDoc): Promise<number> {
  item = await ensureAccounts(uid, item)

  let cursor = item.cursor
  let hasMore = true
  let syncedCount = 0

  const transactionsRef = db.collection('users').doc(uid).collection('plaidTransactions')

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: item.accessToken,
      cursor,
    })
    const { added, modified, removed, has_more, next_cursor } = response.data

    const batch = db.batch()
    // Plaid's own transaction_id is the doc id — re-syncing a modified
    // transaction (e.g. pending -> posted) overwrites the same doc instead
    // of creating a duplicate. `added` vs `modified` get different field
    // sets on purpose: only a genuinely new doc gets createdAt set: a
    // `set(..., {merge: true})` that included createdAt: serverTimestamp()
    // on every write would silently overwrite the original createdAt each
    // time an existing transaction is re-synced.
    for (const transaction of added) {
      batch.set(transactionsRef.doc(transaction.transaction_id), {
        ...buildTransactionDoc(item, transaction),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
    for (const transaction of modified) {
      batch.set(
        transactionsRef.doc(transaction.transaction_id),
        { ...buildTransactionDoc(item, transaction), updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      )
    }
    // Plaid retracted these (e.g. a pending charge that never posted) —
    // unconditional delete. Safe even if already categorized: categorizing
    // creates an independent Purchase/Paycheck (see
    // categorizePlaidTransactionAsSpending/AsIncome) that doesn't reference
    // back to this doc, so deleting the raw record only removes it from
    // the Bank Activity log — the real Purchase/Paycheck is untouched.
    for (const removedTransaction of removed) {
      batch.delete(transactionsRef.doc(removedTransaction.transaction_id))
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
