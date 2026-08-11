import { z } from 'zod'
import { addPaycheckSchema } from './budget'

export const addIncomeSourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  // Required, no default — see src/lib/tax/ for why this drives real tax
  // math (SE tax only applies to self-employment income) rather than being
  // cosmetic, so the user must make an active choice rather than silently
  // inheriting a guessed default.
  incomeType: z.enum(['w2', 'contracted', 'selfEmployed'], {
    message: 'Choose how this income is taxed',
  }),
  autoCategorizeBuckets: z.array(z.string()).optional(),
})

export type AddIncomeSourceInput = z.infer<typeof addIncomeSourceSchema>

// Extends the base amount+date paycheck schema with a required source —
// used by the standalone "Add paycheck" dialog (Budget page), which isn't
// scoped to one source the way IncomeSourcePaychecks's inline per-row form
// is (there, sourceId comes from the expanded row itself, not user input).
export const addPaycheckWithSourceSchema = addPaycheckSchema.extend({
  sourceId: z.string().min(1, 'Source is required'),
})

export type AddPaycheckWithSourceInput = z.infer<
  typeof addPaycheckWithSourceSchema
>
