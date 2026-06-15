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

