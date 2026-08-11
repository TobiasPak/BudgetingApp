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
import { getSourcePaychecks } from '@/lib/income'
import { defaultDateForRange, type DateRange } from '@/lib/period'
import { addPaycheckSchema, type AddPaycheckInput } from '@/lib/schemas/budget'
import { formatCurrency } from '@/lib/utils'
import { PlaidCategoryPicker } from '@/components/budget/PlaidCategoryPicker'
import { INCOME_PLAID_CATEGORY } from '@/lib/plaidCategories'
import type { IncomeSource } from '@/types/incomeSource'

const INCOME_PLAID_CATEGORY_GROUPS = [INCOME_PLAID_CATEGORY]

// The only editable field on an income source — mirrors
// EditCategoryBucketsDialog in CategoryPurchases.tsx exactly.
function EditIncomeSourceBucketsDialog({ source }: { source: IncomeSource }) {
  const [open, setOpen] = useState(false)
  const [buckets, setBuckets] = useState<string[]>(source.autoCategorizeBuckets ?? [])
  const setIncomeSourceBuckets = useBudgetStore((state) => state.setIncomeSourceBuckets)

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) setBuckets(source.autoCategorizeBuckets ?? [])
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
            Matching bank deposits sort into "{source.name}" automatically. You can
            always recategorize manually.
          </DialogDescription>
        </DialogHeader>
        <PlaidCategoryPicker
          groups={INCOME_PLAID_CATEGORY_GROUPS}
          value={buckets}
          onChange={setBuckets}
        />
        <DialogFooter>
          <Button
            onClick={() => {
              setIncomeSourceBuckets(source.id, buckets)
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

// Same reasoning as CategoryPurchases's formatPurchaseDate: build the
// display date from the string's own year/month/day rather than
// `new Date(dateStr)`, to avoid the UTC-midnight parsing shift.
function formatPaycheckDate(dateStr: string) {
  const [year, month, dayOfMonth] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, dayOfMonth).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

interface IncomeSourcePaychecksProps {
  source: IncomeSource
  range: DateRange
}

export function IncomeSourcePaychecks({ source, range }: IncomeSourcePaychecksProps) {
  const paychecks = useBudgetStore((state) => state.paychecks)
  const addPaycheck = useBudgetStore((state) => state.addPaycheck)
  const removePaycheck = useBudgetStore((state) => state.removePaycheck)
  const removeIncomeSource = useBudgetStore((state) => state.removeIncomeSource)

  const sourcePaychecks = getSourcePaychecks(paychecks, source.id, range)
  const defaultDate = defaultDateForRange(range)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPaycheckInput>({
    resolver: zodResolver(addPaycheckSchema),
    defaultValues: { date: defaultDate },
  })

  function onSubmit(data: AddPaycheckInput) {
    addPaycheck({ sourceId: source.id, ...data })
    reset({ date: defaultDateForRange(range) })
  }

  // Mirrors CategoryPurchases: this component stays mounted while the user
  // navigates the shared date filter, so the date field needs an explicit
  // re-default rather than relying on mount-only defaultValues.
  useEffect(() => {
    reset({ date: defaultDateForRange(range) })
  }, [range, reset])

  return (
    <div
      data-slot="income-source-paychecks"
      className="space-y-3 border-t bg-muted/30 px-4 py-3"
    >
      {sourcePaychecks.length > 0 && (
        <div className="space-y-1">
          {sourcePaychecks.map((paycheck) => (
            <div
              key={paycheck.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">
                {formatPaycheckDate(paycheck.date)}
              </span>
              <div className="flex items-center gap-2">
                <span>${formatCurrency(paycheck.amount)}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removePaycheck(paycheck.id, paycheck.date)}
                  aria-label={`Remove paycheck from ${formatPaycheckDate(paycheck.date)}`}
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
          <Label htmlFor={`date-${source.id}`} className="text-xs">
            Date
          </Label>
          <Input
            id={`date-${source.id}`}
            type="date"
            className="h-8 w-36"
            defaultValue={defaultDate}
            {...register('date')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`amount-${source.id}`} className="text-xs">
            Amount ($)
          </Label>
          <Input
            id={`amount-${source.id}`}
            type="number"
            step="0.01"
            className="h-8 w-28"
            {...register('amount', { valueAsNumber: true })}
          />
        </div>
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>
      {(errors.date || errors.amount) && (
        <p className="text-xs text-destructive">
          {errors.date?.message ?? errors.amount?.message}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        <EditIncomeSourceBucketsDialog source={source} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="size-3.5" />
              Delete source
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{source.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes the income source and every paycheck
                ever logged under it — not just what's shown for the
                currently selected month/year. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => removeIncomeSource(source.id)}
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
