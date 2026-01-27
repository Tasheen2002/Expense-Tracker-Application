import { z } from 'zod'
import {
  EXPENSE_TITLE_MIN_LENGTH,
  EXPENSE_TITLE_MAX_LENGTH,
  EXPENSE_DESCRIPTION_MAX_LENGTH,
  EXPENSE_MERCHANT_MAX_LENGTH,
  MIN_EXPENSE_AMOUNT,
  MAX_EXPENSE_AMOUNT,
  SUPPORTED_CURRENCIES,
} from '../../../domain/constants/expense.constants'
import { PaymentMethod } from '../../../domain/enums/payment-method'
import { ExpenseStatus } from '../../../domain/enums/expense-status'

/**
 * Create Expense Schema
 */
export const createExpenseSchema = z.object({
  title: z
    .string()
    .min(EXPENSE_TITLE_MIN_LENGTH, 'Title is required')
    .max(EXPENSE_TITLE_MAX_LENGTH, `Title cannot exceed ${EXPENSE_TITLE_MAX_LENGTH} characters`),
  description: z
    .string()
    .max(EXPENSE_DESCRIPTION_MAX_LENGTH, `Description cannot exceed ${EXPENSE_DESCRIPTION_MAX_LENGTH} characters`)
    .optional(),
  amount: z
    .number()
    .min(MIN_EXPENSE_AMOUNT, `Amount must be at least ${MIN_EXPENSE_AMOUNT}`)
    .max(MAX_EXPENSE_AMOUNT, `Amount cannot exceed ${MAX_EXPENSE_AMOUNT}`),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .refine((val) => SUPPORTED_CURRENCIES.includes(val), {
      message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
    }),
  expenseDate: z.string().datetime('Invalid date format'),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  merchant: z
    .string()
    .max(EXPENSE_MERCHANT_MAX_LENGTH, `Merchant name cannot exceed ${EXPENSE_MERCHANT_MAX_LENGTH} characters`)
    .optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  isReimbursable: z.boolean(),
  tagIds: z.array(z.string().uuid('Invalid tag ID')).optional(),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>

/**
 * Update Expense Schema
 */
export const updateExpenseSchema = z.object({
  title: z
    .string()
    .min(EXPENSE_TITLE_MIN_LENGTH)
    .max(EXPENSE_TITLE_MAX_LENGTH)
    .optional(),
  description: z
    .string()
    .max(EXPENSE_DESCRIPTION_MAX_LENGTH)
    .optional()
    .nullable(),
  amount: z
    .number()
    .min(MIN_EXPENSE_AMOUNT)
    .max(MAX_EXPENSE_AMOUNT)
    .optional(),
  currency: z
    .string()
    .length(3)
    .refine((val) => SUPPORTED_CURRENCIES.includes(val))
    .optional(),
  expenseDate: z.string().datetime().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  merchant: z.string().max(EXPENSE_MERCHANT_MAX_LENGTH).optional().nullable(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  isReimbursable: z.boolean().optional(),
})

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>

/**
 * Filter Expenses Query Schema
 */
export const filterExpensesSchema = z.object({
  categoryId: z.string().uuid().optional(),
  status: z.nativeEnum(ExpenseStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  minAmount: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  maxAmount: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isReimbursable: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  pageSize: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
})

export type FilterExpensesQuery = z.infer<typeof filterExpensesSchema>

/**
 * Add Tag to Expense Schema
 */
export const addTagToExpenseSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID'),
})

export type AddTagToExpenseInput = z.infer<typeof addTagToExpenseSchema>
