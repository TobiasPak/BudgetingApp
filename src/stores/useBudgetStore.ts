import { create } from 'zustand'
import {
  Home,
  ShoppingCart,
  Zap,
  UtensilsCrossed,
  Repeat,
  HeartPulse,
  PiggyBank,
  Landmark,
  Tag,
  Briefcase,
  FileText,
  Car,
  Bike,
  Building2,
} from 'lucide-react'
import type { BudgetCategory, DistributiveOmit } from '@/types/budget'
import type { Paycheck } from '@/types/paycheck'
import type { Purchase } from '@/types/purchase'
import type { IncomeSource } from '@/types/incomeSource'

interface BudgetState {
  categories: BudgetCategory[]
  incomeSources: IncomeSource[]
  paychecks: Paycheck[]
  purchases: Purchase[]
  bankBalance: number
  // How many paychecks you expect per month — used to project a monthly
  // dollar target for "percentage of paycheck" budgets even before all of
  // this month's paychecks have actually been logged.
  paychecksPerMonth: number
  addCategory: (category: DistributiveOmit<BudgetCategory, 'id'>) => void
  addIncomeSource: (source: Omit<IncomeSource, 'id'>) => void
  addPaycheck: (paycheck: Omit<Paycheck, 'id'>) => void
  removePaycheck: (id: string) => void
  addPurchase: (purchase: Omit<Purchase, 'id'>) => void
  removePurchase: (id: string) => void
  setBankBalance: (amount: number) => void
  setPaychecksPerMonth: (count: number) => void
}

// Seed mock paychecks/purchases dated within the current month so
// income/spending figures show real values immediately instead of $0 —
// computed relative to today rather than hardcoded, so the mock data
// doesn't go stale.
const now = new Date()
const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const day = (d: number) => `${currentMonthPrefix}-${String(d).padStart(2, '0')}`

export const useBudgetStore = create<BudgetState>((set) => ({
  categories: [
    { id: 'rent', name: 'Rent', icon: Home, color: 'chart-1', type: 'fixed', monthlyAmount: 1800, resetDay: 1 },
    { id: 'groceries', name: 'Groceries', icon: ShoppingCart, color: 'chart-2', type: 'fixed', monthlyAmount: 500, resetDay: 1 },
    { id: 'utilities', name: 'Utilities', icon: Zap, color: 'chart-3', type: 'fixed', monthlyAmount: 200, resetDay: 1 },
    { id: 'dining', name: 'Dining Out', icon: UtensilsCrossed, color: 'chart-4', type: 'fixed', monthlyAmount: 250, resetDay: 1 },
    { id: 'subscriptions', name: 'Subscriptions', icon: Repeat, color: 'chart-5', type: 'fixed', monthlyAmount: 60, resetDay: 1 },
    { id: 'healthcare', name: 'Healthcare', icon: HeartPulse, color: 'chart-1', type: 'fixed', monthlyAmount: 150, resetDay: 1 },
    { id: 'savings', name: 'Savings', icon: PiggyBank, color: 'chart-2', type: 'percentage', percent: 15, basis: 'monthlyIncome', resetDay: 1 },
    { id: 'tax-savings', name: 'Tax Savings', icon: Landmark, color: 'chart-4', type: 'percentage', percent: 12, basis: 'paycheck', resetDay: 1 },
    { id: 'custom-hobby', name: 'Hobbies', icon: Tag, color: 'chart-3', type: 'fixed', monthlyAmount: 100, isCustom: true, resetDay: 1 },
  ],
  // Categorizes each Paycheck by which income stream it came from — mirrors
  // BudgetCategory's icon/color shape, matching the app's stated hybrid-
  // worker scope (W-2 + 1099 + gig platforms). DoorDash is seeded with no
  // paychecks yet this month, exercising the same "$0 sources are filtered
  // out of the breakdown" path spending/budget breakdowns already handle.
  incomeSources: [
    { id: 'w2-job', name: 'W-2 Job', icon: Briefcase, color: 'chart-1' },
    { id: 'freelance', name: 'Freelance', icon: FileText, color: 'chart-2' },
    { id: 'uber', name: 'Uber', icon: Car, color: 'chart-3' },
    { id: 'doordash', name: 'DoorDash', icon: Bike, color: 'chart-4' },
    { id: 'airbnb', name: 'Airbnb', icon: Building2, color: 'chart-5' },
  ],
  paychecks: [
    { id: 'paycheck-1', amount: 2600, date: day(1), sourceId: 'w2-job' },
    { id: 'paycheck-2', amount: 2600, date: day(15), sourceId: 'w2-job' },
    { id: 'paycheck-3', amount: 800, date: day(10), sourceId: 'freelance' },
    { id: 'paycheck-4', amount: 150, date: day(6), sourceId: 'uber' },
    { id: 'paycheck-5', amount: 180, date: day(20), sourceId: 'uber' },
    { id: 'paycheck-6', amount: 650, date: day(12), sourceId: 'airbnb' },
  ],
  // Itemized so each category's spend is a real sum, not a hardcoded total —
  // dining and subscriptions are deliberately over their targets (312 > 250,
  // 64 > 60) so the overspend styling has something real to show.
  purchases: [
    { id: 'p-rent', categoryId: 'rent', date: day(1), description: 'Rent payment', amount: 1800 },
    { id: 'p-groc-1', categoryId: 'groceries', date: day(3), description: "Trader Joe's", amount: 148 },
    { id: 'p-groc-2', categoryId: 'groceries', date: day(11), description: 'Safeway', amount: 200 },
    { id: 'p-groc-3', categoryId: 'groceries', date: day(19), description: 'Costco', amount: 120 },
    { id: 'p-util-1', categoryId: 'utilities', date: day(5), description: 'Electric bill', amount: 90 },
    { id: 'p-util-2', categoryId: 'utilities', date: day(5), description: 'Water bill', amount: 46 },
    { id: 'p-util-3', categoryId: 'utilities', date: day(6), description: 'Internet', amount: 40 },
    { id: 'p-dine-1', categoryId: 'dining', date: day(4), description: 'Sushi dinner', amount: 85 },
    { id: 'p-dine-2', categoryId: 'dining', date: day(9), description: 'Brunch', amount: 45 },
    { id: 'p-dine-3', categoryId: 'dining', date: day(16), description: 'Pizza night', amount: 62 },
    { id: 'p-dine-4', categoryId: 'dining', date: day(22), description: 'Coffee shop', amount: 120 },
    { id: 'p-sub-1', categoryId: 'subscriptions', date: day(1), description: 'Netflix', amount: 16 },
    { id: 'p-sub-2', categoryId: 'subscriptions', date: day(1), description: 'Spotify', amount: 12 },
    { id: 'p-sub-3', categoryId: 'subscriptions', date: day(2), description: 'iCloud storage', amount: 10 },
    { id: 'p-sub-4', categoryId: 'subscriptions', date: day(2), description: 'Gym app', amount: 26 },
    { id: 'p-health-1', categoryId: 'healthcare', date: day(14), description: 'Pharmacy', amount: 42 },
    { id: 'p-save-1', categoryId: 'savings', date: day(1), description: 'Transfer to savings', amount: 400 },
    { id: 'p-tax-1', categoryId: 'tax-savings', date: day(1), description: 'Tax set-aside', amount: 150 },
    { id: 'p-hobby-1', categoryId: 'custom-hobby', date: day(8), description: 'Art supplies', amount: 35 },
  ],
  bankBalance: 4200,
  paychecksPerMonth: 2,
  addCategory: (category) =>
    set((state) => ({
      categories: [
        ...state.categories,
        { ...category, id: crypto.randomUUID() } as BudgetCategory,
      ],
    })),
  addIncomeSource: (source) =>
    set((state) => ({
      incomeSources: [...state.incomeSources, { ...source, id: crypto.randomUUID() }],
    })),
  addPaycheck: (paycheck) =>
    set((state) => ({
      paychecks: [...state.paychecks, { ...paycheck, id: crypto.randomUUID() }],
    })),
  removePaycheck: (id) =>
    set((state) => ({
      paychecks: state.paychecks.filter((p) => p.id !== id),
    })),
  addPurchase: (purchase) =>
    set((state) => ({
      purchases: [...state.purchases, { ...purchase, id: crypto.randomUUID() }],
    })),
  removePurchase: (id) =>
    set((state) => ({
      purchases: state.purchases.filter((p) => p.id !== id),
    })),
  setBankBalance: (amount) => set({ bankBalance: amount }),
  setPaychecksPerMonth: (count) => set({ paychecksPerMonth: count }),
}))
