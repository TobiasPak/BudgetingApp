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
  Banknote,
  type LucideIcon,
} from 'lucide-react'

// BudgetCategory.icon/IncomeSource.icon are real LucideIcon component
// references in memory (see src/types/budget.ts), but Firestore can't store
// a component reference — only the write path deals in `iconName: string`
// (a literal known at the call site, e.g. AddBudgetDialog's `iconName:
// 'Tag'`); this map is the one place that turns a stored name back into a
// real component when hydrating a Firestore snapshot into store state.
const iconMap: Record<string, LucideIcon> = {
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
  Banknote,
}

const DEFAULT_ICON_NAME = 'Tag'

export function getIcon(name: string): LucideIcon {
  return iconMap[name] ?? iconMap[DEFAULT_ICON_NAME]
}
