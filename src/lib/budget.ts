import type { BudgetCategory } from '@/types/budget'

export function isOverBudget(category: BudgetCategory, monthlyTarget: number) {
  return category.monthlySpent > monthlyTarget
}

export function progressPercent(category: BudgetCategory, monthlyTarget: number) {
  if (monthlyTarget <= 0) return 0
  return Math.min((category.monthlySpent / monthlyTarget) * 100, 100)
}
