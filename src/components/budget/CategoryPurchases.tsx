import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { getCategoryPurchases } from '@/lib/purchases'
import { addPurchaseSchema, type AddPurchaseInput } from '@/lib/schemas/budget'
import { formatCurrency } from '@/lib/utils'
import type { BudgetCategory } from '@/types/budget'

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

// Same reasoning as elsewhere in this file's siblings: build the display
// date from the string's own year/month/day rather than `new Date(dateStr)`
// to avoid the UTC-midnight parsing shift.
function formatPurchaseDate(dateStr: string) {
  const [year, month, dayOfMonth] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, dayOfMonth).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

interface CategoryPurchasesProps {
  category: BudgetCategory
}

export function CategoryPurchases({ category }: CategoryPurchasesProps) {
  const purchases = useBudgetStore((state) => state.purchases)
  const addPurchase = useBudgetStore((state) => state.addPurchase)
  const removePurchase = useBudgetStore((state) => state.removePurchase)

  const categoryPurchases = getCategoryPurchases(purchases, category)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPurchaseInput>({
    resolver: zodResolver(addPurchaseSchema),
    defaultValues: { date: todayIsoDate(), description: '' },
  })

  function onSubmit(data: AddPurchaseInput) {
    addPurchase({ categoryId: category.id, ...data })
    reset({ date: todayIsoDate(), description: '' })
  }

  return (
    <div
      data-slot="category-purchases"
      className="space-y-3 border-t bg-muted/30 px-4 py-3"
    >
      {categoryPurchases.length > 0 && (
        <div className="space-y-1">
          {categoryPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="w-14 shrink-0">
                  {formatPurchaseDate(purchase.date)}
                </span>
                <span className="text-foreground">{purchase.description}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>${formatCurrency(purchase.amount)}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removePurchase(purchase.id)}
                  aria-label={`Remove ${purchase.description}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="space-y-1">
          <Label htmlFor={`date-${category.id}`} className="text-xs">
            Date
          </Label>
          <Input
            id={`date-${category.id}`}
            type="date"
            className="h-8 w-36"
            defaultValue={todayIsoDate()}
            {...register('date')}
          />
        </div>
        <div className="min-w-[140px] flex-1 space-y-1">
          <Label htmlFor={`description-${category.id}`} className="text-xs">
            Description
          </Label>
          <Input
            id={`description-${category.id}`}
            placeholder="e.g. Trader Joe's"
            className="h-8"
            {...register('description')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`amount-${category.id}`} className="text-xs">
            Amount ($)
          </Label>
          <Input
            id={`amount-${category.id}`}
            type="number"
            step="0.01"
            className="h-8 w-24"
            {...register('amount', { valueAsNumber: true })}
          />
        </div>
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>
      {(errors.date || errors.description || errors.amount) && (
        <p className="text-xs text-destructive">
          {errors.date?.message ??
            errors.description?.message ??
            errors.amount?.message}
        </p>
      )}
    </div>
  )
}
