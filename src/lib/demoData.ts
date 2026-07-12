import type {
  FirestoreCategoryDoc,
  FirestoreIncomeSourceDoc,
  FirestorePaycheckDoc,
  FirestorePurchaseDoc,
} from '@/lib/firestore/types'

// The app's original hardcoded mock dataset, relocated here verbatim from
// useBudgetStore.ts once real accounts started empty by default. Used only
// by the "Load demo data" action (src/lib/firestore/demoData.ts) — never by
// store init. Categories/income sources keep their original hand-picked
// string ids (rather than random ones) so paychecks/purchases can reference
// them by a stable id when writing to Firestore, exactly like the old
// in-memory mock data did.

const now = new Date()
const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const day = (d: number) => `${currentMonthPrefix}-${String(d).padStart(2, '0')}`

export const demoCategories: Array<FirestoreCategoryDoc & { id: string }> = [
  { id: 'rent', name: 'Rent', iconName: 'Home', color: 'chart-1', type: 'fixed', monthlyAmount: 1800, resetDay: 1 },
  { id: 'groceries', name: 'Groceries', iconName: 'ShoppingCart', color: 'chart-2', type: 'fixed', monthlyAmount: 500, resetDay: 1 },
  { id: 'utilities', name: 'Utilities', iconName: 'Zap', color: 'chart-3', type: 'fixed', monthlyAmount: 200, resetDay: 1 },
  { id: 'dining', name: 'Dining Out', iconName: 'UtensilsCrossed', color: 'chart-4', type: 'fixed', monthlyAmount: 250, resetDay: 1 },
  { id: 'subscriptions', name: 'Subscriptions', iconName: 'Repeat', color: 'chart-5', type: 'fixed', monthlyAmount: 60, resetDay: 1 },
  { id: 'healthcare', name: 'Healthcare', iconName: 'HeartPulse', color: 'chart-1', type: 'fixed', monthlyAmount: 150, resetDay: 1 },
  { id: 'savings', name: 'Savings', iconName: 'PiggyBank', color: 'chart-2', type: 'percentage', percent: 15, basis: 'monthlyIncome', resetDay: 1 },
  { id: 'tax-savings', name: 'Tax Savings', iconName: 'Landmark', color: 'chart-4', type: 'percentage', percent: 12, basis: 'paycheck', resetDay: 1 },
  { id: 'custom-hobby', name: 'Hobbies', iconName: 'Tag', color: 'chart-3', type: 'fixed', monthlyAmount: 100, isCustom: true, resetDay: 1 },
]

export const demoIncomeSources: Array<
  FirestoreIncomeSourceDoc & { id: string }
> = [
  { id: 'w2-job', name: 'W-2 Job', iconName: 'Briefcase', color: 'chart-1' },
  { id: 'freelance', name: 'Freelance', iconName: 'FileText', color: 'chart-2' },
  { id: 'uber', name: 'Uber', iconName: 'Car', color: 'chart-3' },
  { id: 'doordash', name: 'DoorDash', iconName: 'Bike', color: 'chart-4' },
  { id: 'airbnb', name: 'Airbnb', iconName: 'Building2', color: 'chart-5' },
]

export const demoPaychecks: FirestorePaycheckDoc[] = [
  { amount: 2600, date: day(1), sourceId: 'w2-job' },
  { amount: 2600, date: day(15), sourceId: 'w2-job' },
  { amount: 800, date: day(10), sourceId: 'freelance' },
  { amount: 150, date: day(6), sourceId: 'uber' },
  { amount: 180, date: day(20), sourceId: 'uber' },
  { amount: 650, date: day(12), sourceId: 'airbnb' },
]

export const demoPurchases: FirestorePurchaseDoc[] = [
  { categoryId: 'rent', date: day(1), description: 'Rent payment', amount: 1800 },
  { categoryId: 'groceries', date: day(3), description: "Trader Joe's", amount: 148 },
  { categoryId: 'groceries', date: day(11), description: 'Safeway', amount: 200 },
  { categoryId: 'groceries', date: day(19), description: 'Costco', amount: 120 },
  { categoryId: 'utilities', date: day(5), description: 'Electric bill', amount: 90 },
  { categoryId: 'utilities', date: day(5), description: 'Water bill', amount: 46 },
  { categoryId: 'utilities', date: day(6), description: 'Internet', amount: 40 },
  { categoryId: 'dining', date: day(4), description: 'Sushi dinner', amount: 85 },
  { categoryId: 'dining', date: day(9), description: 'Brunch', amount: 45 },
  { categoryId: 'dining', date: day(16), description: 'Pizza night', amount: 62 },
  { categoryId: 'dining', date: day(22), description: 'Coffee shop', amount: 120 },
  { categoryId: 'subscriptions', date: day(1), description: 'Netflix', amount: 16 },
  { categoryId: 'subscriptions', date: day(1), description: 'Spotify', amount: 12 },
  { categoryId: 'subscriptions', date: day(2), description: 'iCloud storage', amount: 10 },
  { categoryId: 'subscriptions', date: day(2), description: 'Gym app', amount: 26 },
  { categoryId: 'healthcare', date: day(14), description: 'Pharmacy', amount: 42 },
  { categoryId: 'savings', date: day(1), description: 'Transfer to savings', amount: 400 },
  { categoryId: 'tax-savings', date: day(1), description: 'Tax set-aside', amount: 150 },
  { categoryId: 'custom-hobby', date: day(8), description: 'Art supplies', amount: 35 },
]

export const demoBankBalance = 4200
export const demoPaychecksPerMonth = 2
