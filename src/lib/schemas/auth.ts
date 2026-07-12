import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'At least 6 characters'),
})

export type SignInInput = z.infer<typeof signInSchema>

export const signUpSchema = signInSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type SignUpInput = z.infer<typeof signUpSchema>
