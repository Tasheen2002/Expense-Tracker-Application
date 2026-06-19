import { z } from 'zod';
import { toJsonSchema } from './validator';
import { RecurrenceFrequency } from '../../../domain/enums/recurrence-frequency';

/**
 * Create Recurring Expense Schema
 */
export const createRecurringExpenseSchema = z.object({
  frequency: z.nativeEnum(RecurrenceFrequency),
  interval: z.coerce.number().int().min(1).default(1),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid date format' }),
  endDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid date format' }).optional(),
  template: z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().max(5000).optional(),
    amount: z.number().min(0.01, 'Amount must be at least 0.01'),
    currency: z.string().length(3),
    categoryId: z.string().uuid().optional(),
    merchant: z.string().max(255).optional(),
    paymentMethod: z.string().min(1, 'Payment method is required'),
    isReimbursable: z.boolean().default(false),
  }),
});

export type CreateRecurringExpenseInput = z.infer<typeof createRecurringExpenseSchema>;


/**
 * Recurring Expense Params Schema
 */
export const recurringExpenseParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  id: z.string().uuid('Invalid recurring expense ID format'),
});

/**
 * Recurring Trigger Schema (Internal)
 */
export const recurringTriggerSchema = z.object({
  secret: z.string().min(1, 'Secret is required'),
});

export type RecurringTriggerInput = z.infer<typeof recurringTriggerSchema>;

export const recurringExpenseParamsJsonSchema = toJsonSchema(recurringExpenseParamsSchema);
export const createRecurringExpenseBodyJsonSchema = toJsonSchema(createRecurringExpenseSchema);
export const recurringTriggerBodyJsonSchema = toJsonSchema(recurringTriggerSchema);

// ==================== RESPONSE SCHEMAS ====================

export const recurringExpenseTemplateResponseSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  amount: z.number(),
  currency: z.string(),
  categoryId: z.string().uuid().nullable().optional(),
  merchant: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  isReimbursable: z.boolean().nullable().optional(),
  tagIds: z.array(z.string().uuid()).nullable().optional(),
});

export const recurringExpenseResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interval: z.number(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  nextRunDate: z.string(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']),
  template: recurringExpenseTemplateResponseSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RecurringExpenseResponse = z.infer<typeof recurringExpenseResponseSchema>;

// ==================== ENVELOPE JSON SCHEMAS ====================

export const recurringExpenseEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: recurringExpenseResponseSchema,
  })
);

export const recurringTriggerEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      count: z.number(),
    }),
  })
);

export const baseResponseEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
  })
);

