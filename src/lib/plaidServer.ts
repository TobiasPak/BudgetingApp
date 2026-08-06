import { getFirebaseAuth } from '@/lib/firebase'

// The app's only external (non-Firebase) REST client — talks to plaid-server
// (see CLAUDE.md), which does the actual Plaid API calls server-side so the
// real client id/secret never reach the browser. Every route requires a
// Firebase ID token, so every call here fetches a fresh one.
async function plaidFetch<T>(path: string, body?: unknown): Promise<T> {
  const baseUrl = import.meta.env.VITE_PLAID_SERVER_URL
  if (!baseUrl) {
    throw new Error('VITE_PLAID_SERVER_URL is not configured')
  }

  const idToken = await getFirebaseAuth().currentUser?.getIdToken()
  if (!idToken) {
    throw new Error('Not signed in')
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error ?? `Request failed (${res.status})`)
  }

  return res.json() as Promise<T>
}

export function createLinkToken(): Promise<{ linkToken: string }> {
  return plaidFetch('/api/create_link_token')
}

export function exchangePublicToken(
  publicToken: string,
  institutionName?: string
): Promise<{ itemId: string }> {
  return plaidFetch('/api/exchange_public_token', { publicToken, institutionName })
}

export function syncTransactions(): Promise<{ syncedCount: number }> {
  return plaidFetch('/api/sync_transactions')
}

export function syncBalance(): Promise<{ bankBalance: number }> {
  return plaidFetch('/api/sync_balance')
}
