import { Router } from 'express'
import { AccountType } from 'plaid'
import { plaidClient } from '../plaidClient'
import { requireAuth } from '../middleware/requireAuth'
import { db } from '../firebaseAdmin'
import type { PlaidItemDoc } from '../types'

export const syncBalanceRouter = Router()

// POST /api/sync_balance — called alongside sync_transactions at every
// trigger point (post-link, "Sync now", sign-in auto-sync), not on its own
// schedule. Sums real-time balances across every account on every linked
// item and writes the total to users/{uid}.bankBalance, replacing what used
// to be a purely manual, editable number once a bank is connected.
//
// Only `depository`-type accounts (checking/savings) are summed — a
// `credit`-type account's balance represents debt owed, not cash on hand,
// and folding it in would make "bank balance" mean something different
// depending on which accounts happen to be linked. `available` (not
// `current`) is used per account: it's Plaid's own "actually withdrawable
// right now" figure, closer to what this field has always represented here
// than `current` (which for depository accounts can include holds/pending
// debits `available` already nets out). Falls back to `current` only if an
// institution doesn't report `available` (Plaid: available is null exactly
// when the institution doesn't calculate it, per the SDK's own doc comment).
syncBalanceRouter.post('/sync_balance', requireAuth, async (req, res) => {
  try {
    const itemsSnapshot = await db.collection('users').doc(req.uid).collection('plaidItems').get()

    let total = 0
    for (const itemDoc of itemsSnapshot.docs) {
      const item = itemDoc.data() as PlaidItemDoc
      const response = await plaidClient.accountsBalanceGet({ access_token: item.accessToken })
      for (const account of response.data.accounts) {
        if (account.type !== AccountType.Depository) continue
        total += account.balances.available ?? account.balances.current ?? 0
      }
    }

    await db.collection('users').doc(req.uid).set({ bankBalance: total }, { merge: true })

    res.json({ bankBalance: total })
  } catch (error) {
    console.error('sync_balance failed', error)
    res.status(502).json({ error: 'Failed to sync bank balance from Plaid' })
  }
})
