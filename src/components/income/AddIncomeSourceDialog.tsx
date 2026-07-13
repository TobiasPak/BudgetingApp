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
  addIncomeSourceSchema,
  type AddIncomeSourceInput,
} from '@/lib/schemas/income'
import type { ChartColorToken } from '@/types/budget'

// Same reasoning as AddBudgetDialog's chartColors: no icon/color picker UI
// yet, so cycling through the 5 chart tokens by source count keeps
// user-added sources visually distinct from each other.
const chartColors: ChartColorToken[] = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
]

export function AddIncomeSourceDialog() {
  const [open, setOpen] = useState(false)
  const incomeSources = useBudgetStore((state) => state.incomeSources)
  const addIncomeSource = useBudgetStore((state) => state.addIncomeSource)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AddIncomeSourceInput>({
    resolver: zodResolver(addIncomeSourceSchema),
    defaultValues: { name: '' },
  })

  function onSubmit(data: AddIncomeSourceInput) {
    const color = chartColors[incomeSources.length % chartColors.length]
    addIncomeSource({
      name: data.name,
      iconName: 'Banknote',
      color,
      isCustom: true,
      incomeType: data.incomeType,
    })
    reset({ name: '' })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" />
          Add income source
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add income source</DialogTitle>
          <DialogDescription>
            Create a new category to attribute paychecks to (e.g. a gig
            platform or a second job).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Lyft" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="incomeType">Taxed as</Label>
            <Controller
              name="incomeType"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger id="incomeType" className="w-full">
                    <SelectValue placeholder="Choose how this is taxed" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="w2">W-2 wages</SelectItem>
                    <SelectItem value="contracted">Contracted (1099)</SelectItem>
                    <SelectItem value="selfEmployed">
                      Self-employed / freelance
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.incomeType && (
              <p className="text-xs text-destructive">
                {errors.incomeType.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit">Add source</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
