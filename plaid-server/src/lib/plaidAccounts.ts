import { plaidClient } from '../plaidClient'
import type { PlaidAccountInfo } from '../types'

// Shared by exchangeToken.ts (fetched once at link time) and
// syncTransactions.ts (self-healing backfill for items linked before
// per-account names existed) — both need the same account_id -> {name,
// mask} map, built from Plaid's accountsGet.
export async function fetchAccountsMap(
  accessToken: string
): Promise<Record<string, PlaidAccountInfo>> {
  const response = await plaidClient.accountsGet({ access_token: accessToken })
  return Object.fromEntries(
    response.data.accounts.map((account) => [
      account.account_id,
      { name: account.name, mask: account.mask } satisfies PlaidAccountInfo,
    ])
  )
}
