// Plaid's official personal_finance_category taxonomy (PFCv2, current as of
// this writing — fetched from plaid.com/documents/pfc-taxonomy-all.csv, not
// hand-typed from memory, since a wrong bucket string would silently just
// never match anything in resolveAutoCategory). Client-only: plaid-server
// never needs the full list, only string comparison against whatever a
// category/source doc already has stored — see plaidCategoryMatch.ts.
//
// TRANSFER_IN/TRANSFER_OUT are deliberately excluded — this app's
// deriveTransactionType (plaid-server/src/routes/syncTransactions.ts)
// already permanently buckets those as 'transfer', which is never shown in
// Bank Activity and never categorizable at all, so offering them as pickable
// auto-categorize buckets would be misleading (they could never actually
// match anything).

export interface PlaidCategoryGroup {
  primary: string
  label: string
  details: { value: string; label: string }[]
}

// A handful of short acronyms that title-casing would otherwise mangle
// (e.g. "Bnpl and ewa", "Tv and movies").
const ACRONYMS = new Set(['atm', 'bnpl', 'ewa', 'tv'])

function humanize(word: string): string {
  return ACRONYMS.has(word) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)
}

// Exported for TransactionFilterBar's secondary-bucket ("subcategory") add
// dropdown, which labels an arbitrary plaidCategory value present in a
// user's real synced data by looking up that same transaction's own
// plaidCategoryPrimary — not just the ones enumerated in this file's own
// group() calls above.
//
// Strips the `{PRIMARY}_` prefix Plaid's detailed values always carry, then
// converts the remaining SNAKE_CASE into a sentence-case label.
export function detailLabel(detail: string, primary: string): string {
  const stripped = detail.startsWith(`${primary}_`) ? detail.slice(primary.length + 1) : detail
  const words = stripped.split('_').map((w) => w.toLowerCase())
  return words.map((w, i) => (i === 0 ? humanize(w) : ACRONYMS.has(w) ? w.toUpperCase() : w)).join(' ')
}

// Exported for TransactionFilterBar's type pills, which label an arbitrary
// plaidCategoryPrimary value present in a user's real synced data — not
// just the ones enumerated in this file's own group() calls above.
export function primaryLabel(primary: string): string {
  return primary
    .split('_')
    .map((w) => w.toLowerCase())
    .map((w, i) => (i === 0 ? humanize(w) : w))
    .join(' ')
}

function group(primary: string, details: string[]): PlaidCategoryGroup {
  return {
    primary,
    label: primaryLabel(primary),
    details: details.map((value) => ({ value, label: detailLabel(value, primary) })),
  }
}

// The INCOME primary — used by IncomeSource's picker (src/components/income/
// AddIncomeSourceDialog.tsx and its edit dialog).
export const INCOME_PLAID_CATEGORY: PlaidCategoryGroup = group('INCOME', [
  'INCOME_CHILD_SUPPORT',
  'INCOME_CONTRACTOR',
  'INCOME_DIVIDENDS',
  'INCOME_GIG_ECONOMY',
  'INCOME_INTEREST_EARNED',
  'INCOME_LONG_TERM_DISABILITY',
  'INCOME_MILITARY',
  'INCOME_RENTAL',
  'INCOME_RETIREMENT_PENSION',
  'INCOME_SALARY',
  'INCOME_TAX_REFUND',
  'INCOME_UNEMPLOYMENT',
  'INCOME_OTHER',
])

// Every other primary — used by BudgetCategory's picker (src/components/
// budget/AddBudgetDialog.tsx and its edit dialog). transactionType for these
// is 'spending' in practice (see deriveTransactionType) even though a couple
// (LOAN_DISBURSEMENTS in particular) represent money coming in — a known,
// separately-tracked classification gap, not something this picker tries to
// work around.
export const SPENDING_PLAID_CATEGORIES: PlaidCategoryGroup[] = [
  group('LOAN_DISBURSEMENTS', [
    'LOAN_DISBURSEMENTS_AUTO',
    'LOAN_DISBURSEMENTS_CASH_ADVANCES',
    'LOAN_DISBURSEMENTS_EWA',
    'LOAN_DISBURSEMENTS_MORTGAGE',
    'LOAN_DISBURSEMENTS_PERSONAL',
    'LOAN_DISBURSEMENTS_STUDENT',
    'LOAN_DISBURSEMENTS_OTHER_DISBURSEMENT',
  ]),
  group('LOAN_PAYMENTS', [
    'LOAN_PAYMENTS_BNPL',
    'LOAN_PAYMENTS_CAR_PAYMENT',
    'LOAN_PAYMENTS_CASH_ADVANCES',
    'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
    'LOAN_PAYMENTS_EWA',
    'LOAN_PAYMENTS_MORTGAGE_PAYMENT',
    'LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT',
    'LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT',
    'LOAN_PAYMENTS_OTHER_PAYMENT',
  ]),
  group('BANK_FEES', [
    'BANK_FEES_ATM_FEES',
    'BANK_FEES_INSUFFICIENT_FUNDS',
    'BANK_FEES_INTEREST_CHARGE',
    'BANK_FEES_FOREIGN_TRANSACTION_FEES',
    'BANK_FEES_OVERDRAFT_FEES',
    'BANK_FEES_LATE_FEES',
    'BANK_FEES_CASH_ADVANCE',
    'BANK_FEES_OTHER_BANK_FEES',
  ]),
  group('ENTERTAINMENT', [
    'ENTERTAINMENT_CASINOS_AND_GAMBLING',
    'ENTERTAINMENT_MUSIC_AND_AUDIO',
    'ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS',
    'ENTERTAINMENT_TV_AND_MOVIES',
    'ENTERTAINMENT_VIDEO_GAMES',
    'ENTERTAINMENT_OTHER_ENTERTAINMENT',
  ]),
  group('FOOD_AND_DRINK', [
    'FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR',
    'FOOD_AND_DRINK_COFFEE',
    'FOOD_AND_DRINK_FAST_FOOD',
    'FOOD_AND_DRINK_GROCERIES',
    'FOOD_AND_DRINK_RESTAURANT',
    'FOOD_AND_DRINK_VENDING_MACHINES',
    'FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK',
  ]),
  group('GENERAL_MERCHANDISE', [
    'GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS',
    'GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES',
    'GENERAL_MERCHANDISE_CONVENIENCE_STORES',
    'GENERAL_MERCHANDISE_DEPARTMENT_STORES',
    'GENERAL_MERCHANDISE_DISCOUNT_STORES',
    'GENERAL_MERCHANDISE_ELECTRONICS',
    'GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES',
    'GENERAL_MERCHANDISE_OFFICE_SUPPLIES',
    'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES',
    'GENERAL_MERCHANDISE_PET_SUPPLIES',
    'GENERAL_MERCHANDISE_SPORTING_GOODS',
    'GENERAL_MERCHANDISE_SUPERSTORES',
    'GENERAL_MERCHANDISE_TOBACCO_AND_VAPE',
    'GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE',
  ]),
  group('HOME_IMPROVEMENT', [
    'HOME_IMPROVEMENT_FURNITURE',
    'HOME_IMPROVEMENT_HARDWARE',
    'HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE',
    'HOME_IMPROVEMENT_SECURITY',
    'HOME_IMPROVEMENT_OTHER_HOME_IMPROVEMENT',
  ]),
  group('MEDICAL', [
    'MEDICAL_DENTAL_CARE',
    'MEDICAL_EYE_CARE',
    'MEDICAL_NURSING_CARE',
    'MEDICAL_PHARMACIES_AND_SUPPLEMENTS',
    'MEDICAL_PRIMARY_CARE',
    'MEDICAL_VETERINARY_SERVICES',
    'MEDICAL_OTHER_MEDICAL',
  ]),
  group('PERSONAL_CARE', [
    'PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS',
    'PERSONAL_CARE_HAIR_AND_BEAUTY',
    'PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING',
    'PERSONAL_CARE_OTHER_PERSONAL_CARE',
  ]),
  group('GENERAL_SERVICES', [
    'GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING',
    'GENERAL_SERVICES_AUTOMOTIVE',
    'GENERAL_SERVICES_CHILDCARE',
    'GENERAL_SERVICES_CONSULTING_AND_LEGAL',
    'GENERAL_SERVICES_EDUCATION',
    'GENERAL_SERVICES_INSURANCE',
    'GENERAL_SERVICES_POSTAGE_AND_SHIPPING',
    'GENERAL_SERVICES_STORAGE',
    'GENERAL_SERVICES_OTHER_GENERAL_SERVICES',
  ]),
  group('GOVERNMENT_AND_NON_PROFIT', [
    'GOVERNMENT_AND_NON_PROFIT_DONATIONS',
    'GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES',
    'GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT',
    'GOVERNMENT_AND_NON_PROFIT_OTHER_GOVERNMENT_AND_NON_PROFIT',
  ]),
  group('TRANSPORTATION', [
    'TRANSPORTATION_BIKES_AND_SCOOTERS',
    'TRANSPORTATION_GAS',
    'TRANSPORTATION_PARKING',
    'TRANSPORTATION_PUBLIC_TRANSIT',
    'TRANSPORTATION_TAXIS_AND_RIDE_SHARES',
    'TRANSPORTATION_TOLLS',
    'TRANSPORTATION_OTHER_TRANSPORTATION',
  ]),
  group('TRAVEL', [
    'TRAVEL_FLIGHTS',
    'TRAVEL_LODGING',
    'TRAVEL_RENTAL_CARS',
    'TRAVEL_OTHER_TRAVEL',
  ]),
  group('RENT_AND_UTILITIES', [
    'RENT_AND_UTILITIES_GAS_AND_ELECTRICITY',
    'RENT_AND_UTILITIES_INTERNET_AND_CABLE',
    'RENT_AND_UTILITIES_RENT',
    'RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT',
    'RENT_AND_UTILITIES_TELEPHONE',
    'RENT_AND_UTILITIES_WATER',
    'RENT_AND_UTILITIES_OTHER_UTILITIES',
  ]),
  group('OTHER', ['OTHER_OTHER']),
]
