export function isOverBudget(spent: number, monthlyTarget: number) {
  return spent > monthlyTarget
}

export function progressPercent(spent: number, monthlyTarget: number) {
  if (monthlyTarget <= 0) return 0
  return Math.min((spent / monthlyTarget) * 100, 100)
}
