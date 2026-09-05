import { z } from 'zod';
import { toJsonSchema } from './validator';
import {
  EXPENSE_TITLE_MIN_LENGTH,
  EXPENSE_TITLE_MAX_LENGTH,
  EXPENSE_DESCRIPTION_MAX_LENGTH,
  EXPENSE_MERCHANT_MAX_LENGTH,
  MIN_EXPENSE_AMOUNT,
  MAX_EXPENSE_AMOUNT,
  SUPPORTED_CURRENCIES,
} from '../../../domain/constants/expense.constants';
import { PaymentMethod } from '../../../domain/enums/payment-method';
import { ExpenseStatus } from '../../../domain/enums/expense-status';

/**
 * Create Expense Schema
 */
export const createExpenseSchema = z.object({
  title: z
    .string()
    .min(EXPENSE_TITLE_MIN_LENGTH, 'Title is required')
    .max(
      EXPENSE_TITLE_MAX_LENGTH,
      `Title cannot exceed ${EXPENSE_TITLE_MAX_LENGTH} characters`
    ),
  description: z
    .string()
    .max(
      EXPENSE_DESCRIPTION_MAX_LENGTH,
      `Description cannot exceed ${EXPENSE_DESCRIPTION_MAX_LENGTH} characters`
    )
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
  expenseDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  merchant: z
    .string()
    .max(
      EXPENSE_MERCHANT_MAX_LENGTH,
      `Merchant name cannot exceed ${EXPENSE_MERCHANT_MAX_LENGTH} characters`
    )
    .optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  isReimbursable: z.boolean(),
  tagIds: z.array(z.string().uuid('Invalid tag ID')).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

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
  amount: z.number().min(MIN_EXPENSE_AMOUNT).max(MAX_EXPENSE_AMOUNT).optional(),
  currency: z
    .string()
    .length(3)
    .refine((val) => SUPPORTED_CURRENCIES.includes(val))
    .optional(),
  expenseDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)))
    .optional(),
  categoryId: z.string().uuid().optional().nullable(),
  merchant: z.string().max(EXPENSE_MERCHANT_MAX_LENGTH).optional().nullable(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  isReimbursable: z.boolean().optional(),
});

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

/**
 * Filter Expenses Query Schema
 */
export const filterExpensesSchema = z.object({
  userId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.nativeEnum(ExpenseStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  minAmount: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  maxAmount: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)))
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)))
    .optional(),
  isReimbursable: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),
  currency: z.string().length(3).optional(),
  searchText: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  pageSize: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional(),
});

export type FilterExpensesQuery = z.infer<typeof filterExpensesSchema>;

/**
 * Add Tag to Expense Schema
 */
export const addTagToExpenseSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID'),
});

export type AddTagToExpenseInput = z.infer<typeof addTagToExpenseSchema>;

export const createExpenseBodyJsonSchema = toJsonSchema(createExpenseSchema);
export const updateExpenseBodyJsonSchema = toJsonSchema(updateExpenseSchema);
export const filterExpensesQueryJsonSchema = toJsonSchema(filterExpensesSchema);
export const addTagToExpenseBodyJsonSchema = toJsonSchema(addTagToExpenseSchema);

// ==================== RESPONSE SCHEMAS ====================

export const expenseResponseSchema = z.object({
  expenseId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  amount: z.string(),
  currency: z.string(),
  expenseDate: z.string(),
  categoryId: z.string().uuid().nullable().optional(),
  merchant: z.string().nullable().optional(),
  paymentMethod: z.string(),
  status: z.string(),
  isReimbursable: z.boolean(),
  receiptUrl: z.string().nullable().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const expenseStatisticsResponseSchema = z.object({
  totalExpense: z.number(),
  currency: z.string(),
  expenseCountByStatus: z.object({
    draft: z.number(),
    submitted: z.number(),
    approved: z.number(),
    rejected: z.number(),
    reimbursed: z.number(),
  }),
  totalCount: z.number(),
});

export const rejectExpenseBodySchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

export type RejectExpenseBodyInput = z.infer<typeof rejectExpenseBodySchema>;

// JSON schemas
export const rejectExpenseBodyJsonSchema = toJsonSchema(rejectExpenseBodySchema);

// ==================== ENVELOPE JSON SCHEMAS ====================

export const expenseEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: expenseResponseSchema,
  })
);

export const paginatedExpensesEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(expenseResponseSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasMore: z.boolean(),
    }),
  })
);

export const expenseStatisticsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: expenseStatisticsResponseSchema,
  })
);

export const baseResponseEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
  })
);

