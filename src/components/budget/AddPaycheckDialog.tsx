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
import {
  addPaycheckWithSourceSchema,
  type AddPaycheckWithSourceInput,
} from '@/lib/schemas/income'
import { defaultDateForRange, type DateRange } from '@/lib/period'

interface AddPaycheckDialogProps {
  range: DateRange
}

export function AddPaycheckDialog({ range }: AddPaycheckDialogProps) {
  const [open, setOpen] = useState(false)
  const incomeSources = useBudgetStore((state) => state.incomeSources)
  const addPaycheck = useBudgetStore((state) => state.addPaycheck)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AddPaycheckWithSourceInput>({
    resolver: zodResolver(addPaycheckWithSourceSchema),
    defaultValues: {
      date: defaultDateForRange(range),
      sourceId: incomeSources[0]?.id,
    },
  })

  function onSubmit(data: AddPaycheckWithSourceInput) {
    addPaycheck(data)
    reset({
      date: defaultDateForRange(range),
      sourceId: incomeSources[0]?.id,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" />
          Add paycheck
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add paycheck</DialogTitle>
          <DialogDescription>
            Logged paychecks are summed to calculate this month's income.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              defaultValue={defaultDateForRange(range)}
              {...register('date')}
            />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sourceId">Source</Label>
            <Controller
              name="sourceId"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger id="sourceId" className="w-full">
                    <SelectValue placeholder="Choose a source" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeSources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.sourceId && (
              <p className="text-xs text-destructive">{errors.sourceId.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit">Add paycheck</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
