import { z } from 'zod';
import { toJsonSchema } from './validator';

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

// Pre-computed JSON schemas
export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const receiptParamsJsonSchema = toJsonSchema(receiptParamsSchema);
export const tagParamsJsonSchema = toJsonSchema(tagParamsSchema);
export const receiptTagParamsJsonSchema = toJsonSchema(receiptTagParamsSchema);
export const expenseParamsJsonSchema = toJsonSchema(expenseParamsSchema);
export const metadataParamsJsonSchema = toJsonSchema(metadataParamsSchema);

export const baseResponseSchema = z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
});
export const baseResponseJsonSchema = toJsonSchema(baseResponseSchema);

export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;
export type ReceiptParams = z.infer<typeof receiptParamsSchema>;
export type TagParams = z.infer<typeof tagParamsSchema>;
export type ReceiptTagParams = z.infer<typeof receiptTagParamsSchema>;
export type ExpenseParams = z.infer<typeof expenseParamsSchema>;
export type MetadataParams = z.infer<typeof metadataParamsSchema>;
