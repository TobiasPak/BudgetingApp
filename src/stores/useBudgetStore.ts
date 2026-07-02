import { create } from 'zustand'
import {
  Home,
  ShoppingCart,
  Zap,
  UtensilsCrossed,
  Repeat,
  HeartPulse,
  PiggyBank,
  Tag,
} from 'lucide-react'
import type { BudgetCategory } from '@/types/budget'

interface BudgetState {
  categories: BudgetCategory[]
  updateSpent: (id: string, amount: number) => void
  addCategory: (category: Omit<BudgetCategory, 'id'>) => void
}

export const useBudgetStore = create<BudgetState>((set) => ({
  categories: [
    { id: 'rent', name: 'Rent', icon: Home, color: 'chart-1', monthlyBudgeted: 1800, monthlySpent: 1800 },
    { id: 'groceries', name: 'Groceries', icon: ShoppingCart, color: 'chart-2', monthlyBudgeted: 500, monthlySpent: 468 },
    { id: 'utilities', name: 'Utilities', icon: Zap, color: 'chart-3', monthlyBudgeted: 200, monthlySpent: 176 },
    { id: 'dining', name: 'Dining Out', icon: UtensilsCrossed, color: 'chart-4', monthlyBudgeted: 250, monthlySpent: 312 },
    { id: 'subscriptions', name: 'Subscriptions', icon: Repeat, color: 'chart-5', monthlyBudgeted: 60, monthlySpent: 64 },
    { id: 'healthcare', name: 'Healthcare', icon: HeartPulse, color: 'chart-1', monthlyBudgeted: 150, monthlySpent: 42 },
    { id: 'savings', name: 'Savings', icon: PiggyBank, color: 'chart-2', monthlyBudgeted: 400, monthlySpent: 400 },
    { id: 'custom-hobby', name: 'Hobbies', icon: Tag, color: 'chart-3', monthlyBudgeted: 100, monthlySpent: 35, isCustom: true },
  ],
  updateSpent: (id, amount) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, monthlySpent: amount } : c
      ),
    })),
  addCategory: (category) =>
    set((state) => ({
      categories: [...state.categories, { ...category, id: crypto.randomUUID() }],
    })),
}))
