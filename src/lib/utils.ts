import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Always 2 decimal places — needed anywhere a value can be a sum of
// user-entered purchase amounts (which may carry cents), unlike the
// whole-dollar mock data used elsewhere in the app.
export function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
