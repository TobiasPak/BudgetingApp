import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { addBudgetSchema, type AddBudgetInput } from '@/lib/schemas/budget'
import { PlaidCategoryPicker } from '@/components/budget/PlaidCategoryPicker'
import { SPENDING_PLAID_CATEGORIES } from '@/lib/plaidCategories'
import type { ChartColorToken } from '@/types/budget'

// New budgets don't have an icon/color picker UI yet — cycling through the
// 5 chart tokens by category count keeps user-added categories visually
// distinct from each other without adding that scope.
const chartColors: ChartColorToken[] = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
]

export function AddBudgetDialog() {
  const [open, setOpen] = useState(false)
  const categories = useBudgetStore((state) => state.categories)
  const addCategory = useBudgetStore((state) => state.addCategory)

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<AddBudgetInput>({
    resolver: zodResolver(addBudgetSchema),
    defaultValues: { type: 'fixed', name: '', resetDay: 1, autoCategorizeBuckets: [] },
    // Without this, switching from "Fixed" to "Percentage" leaves the
    // now-hidden monthlyAmount field's stale value (an empty string run
    // through valueAsNumber, i.e. NaN) sitting in the form state — Zod's
    // .optional() only tolerates undefined, not NaN, so it fails
    // validation even though the field is no longer visible. This makes
    // RHF actually drop a field's value when its input unmounts.
    shouldUnregister: true,
  })

  const type = watch('type')

  function onSubmit(data: AddBudgetInput) {
    const color = chartColors[categories.length % chartColors.length]
    const base = {
      name: data.name,
      iconName: 'Tag',
      color,
      isCustom: true as const,
      resetDay: data.resetDay,
    }

    const autoCategorizeBuckets = data.autoCategorizeBuckets?.length
      ? data.autoCategorizeBuckets
      : undefined

    if (data.type === 'fixed') {
      addCategory({
        ...base,
        type: 'fixed',
        monthlyAmount: data.monthlyAmount!,
        autoCategorizeBuckets,
      })
    } else {
      addCategory({
        ...base,
        type: 'percentage',
        percent: data.percent!,
        basis: data.basis!,
        autoCategorizeBuckets,
      })
    }

    reset({ type: 'fixed', name: '', resetDay: 1, autoCategorizeBuckets: [] })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" />
          Add budget
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add budget</DialogTitle>
          <DialogDescription>
            Create a fixed dollar target or a percentage-based savings rule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Emergency fund" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resetDay">Resets on day of month</Label>
            <Input
              id="resetDay"
              type="number"
              min={1}
              max={31}
              step="1"
              {...register('resetDay', { valueAsNumber: true })}
            />
            {errors.resetDay && (
              <p className="text-xs text-destructive">{errors.resetDay.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? 'fixed'} onValueChange={field.onChange}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {type === 'fixed' ? (
            <div className="space-y-1.5">
              <Label htmlFor="monthlyAmount">Monthly amount ($)</Label>
              <Input
                id="monthlyAmount"
                type="number"
                step="0.01"
                {...register('monthlyAmount', { valueAsNumber: true })}
              />
              {errors.monthlyAmount && (
                <p className="text-xs text-destructive">
                  {errors.monthlyAmount.message}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="percent">Percent (%)</Label>
                <Input
                  id="percent"
                  type="number"
                  step="0.1"
                  {...register('percent', { valueAsNumber: true })}
                />
                {errors.percent && (
                  <p className="text-xs text-destructive">{errors.percent.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="basis">Of</Label>
                <Controller
                  name="basis"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="basis" className="w-full">
                        <SelectValue placeholder="Choose a basis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthlyIncome">Monthly income</SelectItem>
                        <SelectItem value="paycheck">Each paycheck</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.basis && (
                  <p className="text-xs text-destructive">{errors.basis.message}</p>
                )}
              </div>
            </>
          )}

          <div className="space-y-1.5 border-t pt-4">
            <Label>Auto-categorize transactions</Label>
            <p className="text-xs text-muted-foreground">
              Matching bank transactions sort into this category automatically. You can
              always recategorize manually.
            </p>
            <Controller
              name="autoCategorizeBuckets"
              control={control}
              render={({ field }) => (
                <PlaidCategoryPicker
                  groups={SPENDING_PLAID_CATEGORIES}
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button type="submit">Add budget</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
