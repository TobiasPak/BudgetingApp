import type { FirestorePlaidTransactionDoc } from '@/lib/firestore/types'

// Fake bank transactions for the "Simulate bank sync" demo action
// (src/lib/firestore/plaidDemoData.ts) — stands in for a real Plaid
// transactions-sync response until an actual developer sandbox account
// exists. Deliberately all uncategorized (no categoryId/sourceId set) —
// unlike the "Load demo data" dataset, these represent transactions that
// just arrived from the bank and haven't been sorted yet, so the
// categorize-in-the-UI flow (standing in for the not-yet-built AI agent)
// has something real to do. All on one fake linked account for simplicity.

const now = new Date()
const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const day = (d: number) => `${currentMonthPrefix}-${String(d).padStart(2, '0')}`

const ACCOUNT = 'Chase Total Checking ...4821'

export const demoPlaidTransactions: FirestorePlaidTransactionDoc[] = [
  // Spending
  {
    accountName: ACCOUNT,
    amount: 52.3,
    date: day(2),
    merchantName: 'STARBUCKS #4821 SEATTLE WA',
    plaidCategory: 'Food and Drink > Coffee Shops',
    transactionType: 'spending',
    pending: false,
  },
  {
    accountName: ACCOUNT,
    amount: 89.14,
    date: day(4),
    merchantName: 'AMAZON.COM*1A2B3C4D',
    plaidCategory: 'Shops > Digital Purchase',
    transactionType: 'spending',
    pending: false,
  },
  {
    accountName: ACCOUNT,
    amount: 34.5,
    date: day(7),
    merchantName: 'SHELL OIL 57443929101',
    plaidCategory: 'Travel > Gas Stations',
    transactionType: 'spending',
    pending: false,
  },
  {
    accountName: ACCOUNT,
    amount: 142.87,
    date: day(9),
    merchantName: 'WHOLE FOODS MARKET #10254',
    plaidCategory: 'Shops > Supermarkets and Groceries',
    transactionType: 'spending',
    pending: false,
  },
  {
    accountName: ACCOUNT,
    amount: 15.99,
    date: day(12),
    merchantName: 'NETFLIX.COM',
    plaidCategory: 'Service > Subscription',
    transactionType: 'spending',
    pending: true,
  },
  // Income
  {
    accountName: ACCOUNT,
    amount: 2450,
    date: day(1),
    merchantName: 'ACME CORP PAYROLL DIRECT DEP',
    plaidCategory: 'Transfer > Payroll',
    transactionType: 'income',
    pending: false,
  },
  {
    accountName: ACCOUNT,
    amount: 380,
    date: day(14),
    merchantName: 'UPWORK ESCROW RELEASE',
    plaidCategory: 'Transfer > Deposit',
    transactionType: 'income',
    pending: false,
  },
  {
    accountName: ACCOUNT,
    amount: 65.2,
    date: day(18),
    merchantName: 'AIRBNB PAYOUT',
    plaidCategory: 'Transfer > Deposit',
    transactionType: 'income',
    pending: true,
  },
  // Transfers — money moved between the user's own accounts, never
  // categorized as spending or income.
  {
    accountName: ACCOUNT,
    amount: 500,
    date: day(3),
    merchantName: 'TRANSFER TO SAVINGS ...9012',
    plaidCategory: 'Transfer > Internal Account Transfer',
    transactionType: 'transfer',
    pending: false,
  },
  {
    accountName: ACCOUNT,
    amount: 200,
    date: day(16),
    merchantName: 'VENMO TRANSFER',
    plaidCategory: 'Transfer > Third Party',
    transactionType: 'transfer',
    pending: false,
  },
]
