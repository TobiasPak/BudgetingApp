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
} from 'lucide-react'
import type { BudgetCategory, DistributiveOmit } from '@/types/budget'
import type { Paycheck } from '@/types/paycheck'

interface BudgetState {
  categories: BudgetCategory[]
  paychecks: Paycheck[]
  bankBalance: number
  // How many paychecks you expect per month — used to project a monthly
  // dollar target for "percentage of paycheck" budgets even before all of
  // this month's paychecks have actually been logged.
  paychecksPerMonth: number
  updateSpent: (id: string, amount: number) => void
  addCategory: (category: DistributiveOmit<BudgetCategory, 'id'>) => void
  addPaycheck: (paycheck: Omit<Paycheck, 'id'>) => void
  removePaycheck: (id: string) => void
  setBankBalance: (amount: number) => void
  setPaychecksPerMonth: (count: number) => void
}

// Seed two mock paychecks dated within the current month so income-derived
// figures (monthly income, percentage-based budget targets) show real
// values immediately instead of $0 — computed relative to today rather
// than hardcoded, so the mock data doesn't go stale.
const now = new Date()
const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

export const useBudgetStore = create<BudgetState>((set) => ({
  categories: [
    { id: 'rent', name: 'Rent', icon: Home, color: 'chart-1', type: 'fixed', monthlyAmount: 1800, monthlySpent: 1800 },
    { id: 'groceries', name: 'Groceries', icon: ShoppingCart, color: 'chart-2', type: 'fixed', monthlyAmount: 500, monthlySpent: 468 },
    { id: 'utilities', name: 'Utilities', icon: Zap, color: 'chart-3', type: 'fixed', monthlyAmount: 200, monthlySpent: 176 },
    { id: 'dining', name: 'Dining Out', icon: UtensilsCrossed, color: 'chart-4', type: 'fixed', monthlyAmount: 250, monthlySpent: 312 },
    { id: 'subscriptions', name: 'Subscriptions', icon: Repeat, color: 'chart-5', type: 'fixed', monthlyAmount: 60, monthlySpent: 64 },
    { id: 'healthcare', name: 'Healthcare', icon: HeartPulse, color: 'chart-1', type: 'fixed', monthlyAmount: 150, monthlySpent: 42 },
    { id: 'savings', name: 'Savings', icon: PiggyBank, color: 'chart-2', type: 'percentage', percent: 15, basis: 'monthlyIncome', monthlySpent: 400 },
    { id: 'tax-savings', name: 'Tax Savings', icon: Landmark, color: 'chart-4', type: 'percentage', percent: 12, basis: 'paycheck', monthlySpent: 150 },
    { id: 'custom-hobby', name: 'Hobbies', icon: Tag, color: 'chart-3', type: 'fixed', monthlyAmount: 100, monthlySpent: 35, isCustom: true },
  ],
  paychecks: [
    { id: 'paycheck-1', amount: 2600, date: `${currentMonthPrefix}-01` },
    { id: 'paycheck-2', amount: 2600, date: `${currentMonthPrefix}-15` },
  ],
  bankBalance: 4200,
  paychecksPerMonth: 2,
  updateSpent: (id, amount) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, monthlySpent: amount } : c
      ),
    })),
  addCategory: (category) =>
    set((state) => ({
      categories: [
        ...state.categories,
        { ...category, id: crypto.randomUUID() } as BudgetCategory,
      ],
    })),
  addPaycheck: (paycheck) =>
    set((state) => ({
      paychecks: [...state.paychecks, { ...paycheck, id: crypto.randomUUID() }],
    })),
  removePaycheck: (id) =>
    set((state) => ({
      paychecks: state.paychecks.filter((p) => p.id !== id),
    })),
  setBankBalance: (amount) => set({ bankBalance: amount }),
  setPaychecksPerMonth: (count) => set({ paychecksPerMonth: count }),
}))
