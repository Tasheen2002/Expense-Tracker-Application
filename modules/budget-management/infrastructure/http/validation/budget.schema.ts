import { z } from 'zod'
import {
  BUDGET_NAME_MIN_LENGTH,
  BUDGET_NAME_MAX_LENGTH,
  BUDGET_DESCRIPTION_MAX_LENGTH,
  MIN_BUDGET_AMOUNT,
  MAX_BUDGET_AMOUNT,
  SUPPORTED_CURRENCIES,
} from '../../../domain/constants/budget.constants'
import { BudgetPeriodType } from '../../../domain/enums/budget-period-type'
import { BudgetStatus } from '../../../domain/enums/budget-status'

/**
 * Create Budget Schema
 */
export const createBudgetSchema = z.object({
  name: z
    .string()
    .min(BUDGET_NAME_MIN_LENGTH, 'Budget name is required')
    .max(BUDGET_NAME_MAX_LENGTH, `Budget name cannot exceed ${BUDGET_NAME_MAX_LENGTH} characters`),
  description: z
    .string()
    .max(BUDGET_DESCRIPTION_MAX_LENGTH, `Description cannot exceed ${BUDGET_DESCRIPTION_MAX_LENGTH} characters`)
    .optional(),
  totalAmount: z
    .number()
    .min(MIN_BUDGET_AMOUNT, `Total amount must be at least ${MIN_BUDGET_AMOUNT}`)
    .max(MAX_BUDGET_AMOUNT, `Total amount cannot exceed ${MAX_BUDGET_AMOUNT}`),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .refine((val) => SUPPORTED_CURRENCIES.includes(val), {
      message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
    }),
  periodType: z.nativeEnum(BudgetPeriodType),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  isRecurring: z.boolean().default(false),
  rolloverUnused: z.boolean().default(false),
})

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>

/**
 * Update Budget Schema
 */
export const updateBudgetSchema = z.object({
  name: z.string().min(BUDGET_NAME_MIN_LENGTH).max(BUDGET_NAME_MAX_LENGTH).optional(),
  description: z.string().max(BUDGET_DESCRIPTION_MAX_LENGTH).optional().nullable(),
  totalAmount: z.number().min(MIN_BUDGET_AMOUNT).max(MAX_BUDGET_AMOUNT).optional(),
  currency: z
    .string()
    .length(3)
    .refine((val) => SUPPORTED_CURRENCIES.includes(val))
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isRecurring: z.boolean().optional(),
  rolloverUnused: z.boolean().optional(),
})

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>

/**
 * List Budgets Query Schema
 */
export const listBudgetsSchema = z.object({
  status: z.nativeEnum(BudgetStatus).optional(),
  periodType: z.nativeEnum(BudgetPeriodType).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  pageSize: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
})

export type ListBudgetsQuery = z.infer<typeof listBudgetsSchema>
