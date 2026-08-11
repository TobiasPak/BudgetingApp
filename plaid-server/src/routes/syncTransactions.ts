import { Router } from 'express'
import { FieldValue, type WriteBatch } from 'firebase-admin/firestore'
import type { Transaction } from 'plaid'
import { plaidClient } from '../plaidClient'
import { requireAuth } from '../middleware/requireAuth'
import { db } from '../firebaseAdmin'
import { fetchAccountsMap } from '../lib/plaidAccounts'
import { recomputeSnapshotsForDates } from '../lib/recomputeSnapshot'
import { resolveAutoCategory, type AutoCategorizeTarget } from '../lib/plaidCategoryMatch'
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
// (Plaid's coarse ~18-value bucket, e.g. "FOOD_AND_DRINK") separately from
// plaidCategory (the much more granular "detailed" string) specifically so
// a future auto-sort-into-budget-categories feature has a small, stable
// set of values to match against instead of Plaid's full detailed taxonomy.
// Both are derived from the same personal_finance_category object so they
// populate as a consistent pair; when Plaid doesn't return that object at
// all (older/legacy-categorized transactions), both fall back to the same
// deprecated `category` array instead of just one of them silently ending
// up populated and the other missing — category[0] is the coarse bucket in
// that legacy taxonomy, playing the same role `primary` does in the modern
// one, and the full array joined is what plaidCategory already fell back
// to before this fix.
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
  const detailedCategory =
    transaction.personal_finance_category?.detailed ?? transaction.category?.join(' > ')
  const primaryCategory = transaction.personal_finance_category?.primary ?? transaction.category?.[0]

  return {
    accountName: deriveAccountName(item, transaction),
    amount: Math.abs(transaction.amount),
    date: transaction.date,
    ...(transaction.authorized_date ? { authorizedDate: transaction.authorized_date } : {}),
    merchantName: transaction.merchant_name ?? transaction.name,
    ...(transaction.logo_url ? { logoUrl: transaction.logo_url } : {}),
    plaidCategory: detailedCategory ?? 'Uncategorized',
    ...(primaryCategory ? { plaidCategoryPrimary: primaryCategory } : {}),
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
    const usersRef = db.collection('users').doc(req.uid)
    const [itemsSnapshot, categoriesSnapshot, sourcesSnapshot] = await Promise.all([
      usersRef.collection('plaidItems').get(),
      usersRef.collection('categories').get(),
      usersRef.collection('incomeSources').get(),
    ])
    // Fetched once for the whole request (not per item/per transaction) —
    // a user's category/source bucket mappings don't change mid-sync, and
    // this can be reused across every linked item.
    const categories: AutoCategorizeTarget[] = categoriesSnapshot.docs.map((d) => ({
      id: d.id,
      autoCategorizeBuckets: d.data().autoCategorizeBuckets,
    }))
    const incomeSources: AutoCategorizeTarget[] = sourcesSnapshot.docs.map((d) => ({
      id: d.id,
      autoCategorizeBuckets: d.data().autoCategorizeBuckets,
    }))

    let totalSynced = 0
    for (const itemDoc of itemsSnapshot.docs) {
      const item = itemDoc.data() as PlaidItemDoc
      totalSynced += await syncOneItem(req.uid, item, categories, incomeSources)
    }

    res.json({ syncedCount: totalSynced })
  } catch (error) {
    console.error('sync_transactions failed', error)
    res.status(502).json({ error: 'Failed to sync transactions from Plaid' })
  }
})

// Resolves an auto-categorize match for a freshly-built transaction doc and,
// if found, adds the corresponding Purchase/Paycheck doc to the same batch
// — mirrors categorizePlaidTransactionAsSpending/AsIncome
// (src/lib/firestore/writes.ts) exactly, just done server-side via the
// Admin SDK in the same batch as the transaction write itself, rather than
// a separate call after the fact. Returns the fields to merge onto the
// transaction doc (empty object when nothing matched).
function applyAutoCategorization(
  uid: string,
  batch: WriteBatch,
  transactionDoc: FirestorePlaidTransactionDoc,
  categories: AutoCategorizeTarget[],
  incomeSources: AutoCategorizeTarget[]
): Partial<Pick<FirestorePlaidTransactionDoc, 'categoryId' | 'purchaseId' | 'sourceId' | 'paycheckId'>> {
  const match = resolveAutoCategory(
    {
      transactionType: transactionDoc.transactionType,
      plaidCategory: transactionDoc.plaidCategory,
      plaidCategoryPrimary: transactionDoc.plaidCategoryPrimary,
    },
    categories,
    incomeSources
  )
  if (!match) return {}

  const usersRef = db.collection('users').doc(uid)
  if (match.kind === 'category') {
    const purchaseRef = usersRef.collection('purchases').doc()
    batch.set(purchaseRef, {
      categoryId: match.id,
      date: transactionDoc.date,
      description: transactionDoc.merchantName,
      amount: transactionDoc.amount,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { categoryId: match.id, purchaseId: purchaseRef.id }
  }

  const paycheckRef = usersRef.collection('paychecks').doc()
  batch.set(paycheckRef, {
    sourceId: match.id,
    date: transactionDoc.date,
    amount: transactionDoc.amount,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  return { sourceId: match.id, paycheckId: paycheckRef.id }
}

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

async function syncOneItem(
  uid: string,
  item: PlaidItemDoc,
  categories: AutoCategorizeTarget[],
  incomeSources: AutoCategorizeTarget[]
): Promise<number> {
  item = await ensureAccounts(uid, item)

  let cursor = item.cursor
  let hasMore = true
  let syncedCount = 0
  // Every date this sync touches, across every page — a first-ever sync can
  // span months of history. Recomputed once, deduped by month, after the
  // whole sync finishes (see recomputeSnapshotsForDates).
  const affectedDates = new Set<string>()

  const transactionsRef = db.collection('users').doc(uid).collection('plaidTransactions')

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: item.accessToken,
      cursor,
    })
    const { added, modified, removed, has_more, next_cursor } = response.data

    // Plaid's `removed` entries only carry transaction_id, not date — read
    // each doc's current data before deleting it so its period can still be
    // recomputed afterward. Removed transactions are rare in practice
    // (pending charges that never posted), so this extra read is cheap.
    const removedDocs = await Promise.all(
      removed.map((r) => transactionsRef.doc(r.transaction_id).get())
    )
    // Same reasoning for `modified`: need each one's CURRENT doc to know
    // whether it's already categorized (manually or by an earlier auto-
    // categorize pass) before deciding whether to attempt auto-
    // categorization on it — a re-synced transaction that's already
    // categorized must never be re-matched/re-categorized.
    const modifiedDocs = await Promise.all(
      modified.map((t) => transactionsRef.doc(t.transaction_id).get())
    )

    const batch = db.batch()
    // Plaid's own transaction_id is the doc id — re-syncing a modified
    // transaction (e.g. pending -> posted) overwrites the same doc instead
    // of creating a duplicate. `added` vs `modified` get different field
    // sets on purpose: only a genuinely new doc gets createdAt set: a
    // `set(..., {merge: true})` that included createdAt: serverTimestamp()
    // on every write would silently overwrite the original createdAt each
    // time an existing transaction is re-synced.
    for (const transaction of added) {
      const transactionDoc = buildTransactionDoc(item, transaction)
      const categorization = applyAutoCategorization(
        uid,
        batch,
        transactionDoc,
        categories,
        incomeSources
      )
      batch.set(transactionsRef.doc(transaction.transaction_id), {
        ...transactionDoc,
        ...categorization,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      affectedDates.add(transaction.date)
    }
    for (const [index, transaction] of modified.entries()) {
      const existing = modifiedDocs[index].data() as FirestorePlaidTransactionDoc | undefined
      const alreadyCategorized = Boolean(existing?.categoryId || existing?.sourceId)
      const transactionDoc = buildTransactionDoc(item, transaction)
      const categorization = alreadyCategorized
        ? {}
        : applyAutoCategorization(uid, batch, transactionDoc, categories, incomeSources)
      batch.set(
        transactionsRef.doc(transaction.transaction_id),
        { ...transactionDoc, ...categorization, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      )
      affectedDates.add(transaction.date)
    }
    // Plaid retracted these (e.g. a pending charge that never posted) —
    // unconditional delete. Safe even if already categorized: categorizing
    // creates an independent Purchase/Paycheck (see
    // categorizePlaidTransactionAsSpending/AsIncome) that doesn't reference
    // back to this doc, so deleting the raw record only removes it from
    // the Bank Activity log — the real Purchase/Paycheck is untouched.
    for (const removedDoc of removedDocs) {
      batch.delete(removedDoc.ref)
      const removedDate = removedDoc.data()?.date as string | undefined
      if (removedDate) affectedDates.add(removedDate)
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

  if (affectedDates.size > 0) {
    await recomputeSnapshotsForDates(uid, Array.from(affectedDates))
  }

  return syncedCount
}
