import type { BudgetCategory } from '@/types/budget'

export function isOverBudget(category: BudgetCategory) {
  return category.monthlySpent > category.monthlyBudgeted
}

export function progressPercent(category: BudgetCategory) {
  return Math.min((category.monthlySpent / category.monthlyBudgeted) * 100, 100)
}
