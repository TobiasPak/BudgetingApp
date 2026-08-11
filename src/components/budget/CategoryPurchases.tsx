import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { getCategoryPurchases } from '@/lib/purchases'
import { defaultDateForRange, type DateRange } from '@/lib/period'
import { addPurchaseSchema, type AddPurchaseInput } from '@/lib/schemas/budget'
import { formatCurrency } from '@/lib/utils'
import { PlaidCategoryPicker } from '@/components/budget/PlaidCategoryPicker'
import { SPENDING_PLAID_CATEGORIES } from '@/lib/plaidCategories'
import type { BudgetCategory } from '@/types/budget'

// The only editable field on a category — see BudgetCategoryBase.
// autoCategorizeBuckets. Local `buckets` state (not RHF) since this is a
// one-field save-on-click dialog, not a multi-field form.
function EditCategoryBucketsDialog({ category }: { category: BudgetCategory }) {
  const [open, setOpen] = useState(false)
  const [buckets, setBuckets] = useState<string[]>(category.autoCategorizeBuckets ?? [])
  const setCategoryBuckets = useBudgetStore((state) => state.setCategoryBuckets)

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) setBuckets(category.autoCategorizeBuckets ?? [])
    setOpen(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-3.5" />
          Auto-categorize
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Auto-categorize transactions</DialogTitle>
          <DialogDescription>
            Matching bank transactions sort into "{category.name}" automatically. You
            can always recategorize manually.
          </DialogDescription>
        </DialogHeader>
        <PlaidCategoryPicker
          groups={SPENDING_PLAID_CATEGORIES}
          value={buckets}
          onChange={setBuckets}
        />
        <DialogFooter>
          <Button
            onClick={() => {
              setCategoryBuckets(category.id, buckets)
              setOpen(false)
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
  range: DateRange
}

export function CategoryPurchases({ category, range }: CategoryPurchasesProps) {
  const purchases = useBudgetStore((state) => state.purchases)
  const addPurchase = useBudgetStore((state) => state.addPurchase)
  const removePurchase = useBudgetStore((state) => state.removePurchase)
  const removeCategory = useBudgetStore((state) => state.removeCategory)

  const categoryPurchases = getCategoryPurchases(purchases, category, range)
  const defaultDate = defaultDateForRange(range)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPurchaseInput>({
    resolver: zodResolver(addPurchaseSchema),
    defaultValues: { date: defaultDate, description: '' },
  })

  function onSubmit(data: AddPurchaseInput) {
    addPurchase({ categoryId: category.id, ...data })
    reset({ date: defaultDateForRange(range), description: '' })
  }

  // useForm's defaultValues only apply at mount — this component stays
  // mounted while the user navigates the shared date filter (it doesn't
  // collapse/re-expand), so without this the date field would keep
  // defaulting to whatever window was active when the row was first
  // expanded.
  useEffect(() => {
    reset({ date: defaultDateForRange(range), description: '' })
  }, [range, reset])

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
                  onClick={() => removePurchase(purchase.id, purchase.date)}
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
            defaultValue={defaultDate}
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

      <div className="flex justify-end gap-2 border-t pt-3">
        <EditCategoryBucketsDialog category={category} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="size-3.5" />
              Delete category
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{category.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes the category and every purchase ever
                logged under it — not just what's shown for the currently
                selected month/year. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => removeCategory(category.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
