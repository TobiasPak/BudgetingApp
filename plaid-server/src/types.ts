// Mirrors src/lib/firestore/types.ts's FirestorePlaidTransactionDoc (the
// frontend project). Duplicated rather than imported — this is a separate
// Node package with its own tsconfig/runtime, same reasoning functions/
// already keeps its own type copies instead of reaching into src/. Keep
// this shape in sync with the frontend's by hand if either changes.
export type PlaidTransactionType = 'spending' | 'income' | 'transfer'

export interface FirestorePlaidTransactionDoc {
  accountName: string
  amount: number
  date: string
  merchantName: string
  plaidCategory: string
  transactionType: PlaidTransactionType
  pending: boolean
  categoryId?: string
  purchaseId?: string
  sourceId?: string
  paycheckId?: string
}

// A linked Plaid item's server-only credentials + sync cursor. Lives at
// users/{uid}/plaidItems/{itemId} — deliberately NOT in the frontend's
// type files, since the client must never read this collection (see
// firestore.rules: plaidItems denies all client access). accessToken
// grants ongoing read access to the linked bank account; treat it with
// the same care as the Plaid client secret itself.
export interface PlaidItemDoc {
  itemId: string
  accessToken: string
  cursor?: string
  institutionName?: string
}
