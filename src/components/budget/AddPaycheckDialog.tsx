import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { useBudgetStore } from '@/stores/useBudgetStore'
import { addPaycheckSchema, type AddPaycheckInput } from '@/lib/schemas/budget'
import { defaultDateForReference } from '@/lib/period'

interface AddPaycheckDialogProps {
  referenceDate: Date
}

export function AddPaycheckDialog({ referenceDate }: AddPaycheckDialogProps) {
  const [open, setOpen] = useState(false)
  const addPaycheck = useBudgetStore((state) => state.addPaycheck)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPaycheckInput>({
    resolver: zodResolver(addPaycheckSchema),
    defaultValues: { date: defaultDateForReference(referenceDate) },
  })

  function onSubmit(data: AddPaycheckInput) {
    addPaycheck(data)
    reset({ date: defaultDateForReference(referenceDate) })
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
              defaultValue={defaultDateForReference(referenceDate)}
              {...register('date')}
            />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
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
