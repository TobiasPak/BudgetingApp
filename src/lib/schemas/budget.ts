import { z } from 'zod'

// Deliberately z.number(), not z.coerce.number(): coerce's *input* type is
// `unknown` (it'll try to coerce anything) while its *output* type is
// `number` — React Hook Form's single type parameter can't reconcile an
// input/output mismatch like that. Instead, the number inputs convert their
// string value to a number themselves via `register(name, { valueAsNumber:
// true })`, so both sides agree on `number` from the start.
//
// This is a flat object (not z.discriminatedUnion) even though the data is
// conceptually one of two shapes — React Hook Form's `register`/`errors`/
// `watch` generics want a single consistent field set to key off, and a
// discriminated union type makes those awkward to use (accessing
// `errors.monthlyAmount` doesn't type-check cleanly when the field only
// exists on one branch of the union). superRefine enforces the same
// per-type validation rules at runtime that a discriminated union would.
export const addBudgetSchema = z
  .object({
    type: z.enum(['fixed', 'percentage']),
    name: z.string().min(1, 'Name is required'),
    resetDay: z
      .number()
      .int('Must be a whole number')
      .min(1, 'Must be between 1 and 31')
      .max(31, 'Must be between 1 and 31'),
    monthlyAmount: z.number().optional(),
    percent: z.number().optional(),
    basis: z.enum(['paycheck', 'monthlyIncome']).optional(),
    autoCategorizeBuckets: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'fixed') {
      if (!data.monthlyAmount || data.monthlyAmount <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['monthlyAmount'],
          message: 'Must be greater than 0',
        })
      }
    } else {
      if (!data.percent || data.percent <= 0 || data.percent > 100) {
        ctx.addIssue({
          code: 'custom',
          path: ['percent'],
          message: 'Must be between 0 and 100',
        })
      }
      if (!data.basis) {
        ctx.addIssue({ code: 'custom', path: ['basis'], message: 'Required' })
      }
    }
  })

export type AddBudgetInput = z.infer<typeof addBudgetSchema>

export const addPaycheckSchema = z.object({
  amount: z.number().positive('Must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
})

export type AddPaycheckInput = z.infer<typeof addPaycheckSchema>

export const addPurchaseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Must be greater than 0'),
})

export type AddPurchaseInput = z.infer<typeof addPurchaseSchema>
