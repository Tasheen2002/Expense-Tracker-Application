import { z } from 'zod'
import {
  MIN_BUDGET_AMOUNT,
  MAX_BUDGET_AMOUNT,
  SUPPORTED_CURRENCIES,
} from '../../../domain/constants/budget.constants'
import { BudgetPeriodType } from '../../../domain/enums/budget-period-type'

/**
 * Create Spending Limit Schema
 */
export const createSpendingLimitSchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional().nullable(),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  limitAmount: z
    .number()
    .min(MIN_BUDGET_AMOUNT, `Limit amount must be at least ${MIN_BUDGET_AMOUNT}`)
    .max(MAX_BUDGET_AMOUNT, `Limit amount cannot exceed ${MAX_BUDGET_AMOUNT}`),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .refine((val) => SUPPORTED_CURRENCIES.includes(val), {
      message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
    }),
  periodType: z.nativeEnum(BudgetPeriodType),
  isActive: z.boolean().default(true),
})

export type CreateSpendingLimitInput = z.infer<typeof createSpendingLimitSchema>

/**
 * Update Spending Limit Schema
 */
export const updateSpendingLimitSchema = z.object({
  limitAmount: z.number().min(MIN_BUDGET_AMOUNT).max(MAX_BUDGET_AMOUNT).optional(),
  currency: z
    .string()
    .length(3)
    .refine((val) => SUPPORTED_CURRENCIES.includes(val))
    .optional(),
  periodType: z.nativeEnum(BudgetPeriodType).optional(),
  isActive: z.boolean().optional(),
})

export type UpdateSpendingLimitInput = z.infer<typeof updateSpendingLimitSchema>
