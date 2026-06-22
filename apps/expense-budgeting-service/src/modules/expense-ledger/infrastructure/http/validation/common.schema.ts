import { z } from 'zod';
import { toJsonSchema } from './validator';

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
});

export const expenseParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  expenseId: z.string().uuid('Invalid expense ID format'),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const expenseParamsJsonSchema = toJsonSchema(expenseParamsSchema);
export const paginationQueryJsonSchema = toJsonSchema(paginationQuerySchema);

