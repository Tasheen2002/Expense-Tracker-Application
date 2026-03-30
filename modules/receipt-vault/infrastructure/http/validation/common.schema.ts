import { z } from 'zod';

/**
 * Workspace parameters schema
 */
export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
});

/**
 * Receipt parameters schema
 */
export const receiptParamsSchema = workspaceParamsSchema.extend({
  receiptId: z.string().uuid('Invalid receipt ID format'),
});

/**
 * Tag parameters schema
 */
export const tagParamsSchema = workspaceParamsSchema.extend({
  tagId: z.string().uuid('Invalid tag ID format'),
});

/**
 * Receipt Tag parameters schema
 */
export const receiptTagParamsSchema = receiptParamsSchema.extend({
  tagId: z.string().uuid('Invalid tag ID format'),
});

/**
 * Expense parameters schema
 */
export const expenseParamsSchema = workspaceParamsSchema.extend({
  expenseId: z.string().uuid('Invalid expense ID format'),
});

/**
 * Metadata parameters schema
 */
export const metadataParamsSchema = receiptParamsSchema;
