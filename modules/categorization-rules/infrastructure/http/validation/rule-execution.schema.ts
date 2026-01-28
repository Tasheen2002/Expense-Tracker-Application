import { z } from 'zod'

export const evaluateRulesSchema = z.object({
  expenseId: z.string().uuid('Invalid expense ID format'),
  expenseData: z.object({
    merchant: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().positive('Amount must be positive'),
    paymentMethod: z.string().optional(),
  }),
})

export const expenseIdParamSchema = z.object({
  expenseId: z.string().uuid('Invalid expense ID format'),
})

export type EvaluateRulesBody = z.infer<typeof evaluateRulesSchema>
export type ExpenseIdParam = z.infer<typeof expenseIdParamSchema>
