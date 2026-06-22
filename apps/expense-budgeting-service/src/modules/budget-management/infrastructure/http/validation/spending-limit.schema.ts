import { z } from 'zod';
import { BudgetPeriodType } from '../../../domain/enums/budget-period-type';
import { toJsonSchema } from './validator';

/**
 * Route Params Schemas
 */
export const spendingLimitWorkspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
});
export type SpendingLimitWorkspaceParams = z.infer<typeof spendingLimitWorkspaceParamsSchema>;

export const spendingLimitParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  limitId: z.string().uuid('Invalid spending limit ID format'),
});
export type SpendingLimitParams = z.infer<typeof spendingLimitParamsSchema>;

/**
 * Body & Query Schemas
 */
export const createSpendingLimitSchema = z.object({
  userId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  limitAmount: z.union([z.number().positive(), z.string()]),
  currency: z.string().length(3),
  periodType: z.nativeEnum(BudgetPeriodType),
});
export type CreateSpendingLimitBody = z.infer<typeof createSpendingLimitSchema>;

export const updateSpendingLimitSchema = z
  .object({
    userId: z.string().uuid().optional(),
    limitAmount: z.union([z.number().positive(), z.string()]).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one spending limit field must be provided',
  });
export type UpdateSpendingLimitBody = z.infer<typeof updateSpendingLimitSchema>;

export const listSpendingLimitsSchema = z.object({
  userId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  periodType: z.nativeEnum(BudgetPeriodType).optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional(),
});
export type ListSpendingLimitsQuery = z.infer<typeof listSpendingLimitsSchema>;

/**
 * Response DTO Schema
 */
export const spendingLimitResponseSchema = z.object({
  limitId: z.string().uuid(),
  workspaceId: z.string(),
  userId: z.string().nullable(),
  categoryId: z.string().nullable(),
  limitAmount: z.string(),
  currency: z.string(),
  periodType: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Pre-computed JSON Validation Schemas
 */
export const spendingLimitWorkspaceParamsJsonSchema = toJsonSchema(spendingLimitWorkspaceParamsSchema);
export const spendingLimitParamsJsonSchema = toJsonSchema(spendingLimitParamsSchema);
export const createSpendingLimitBodyJsonSchema = toJsonSchema(createSpendingLimitSchema);
export const updateSpendingLimitBodyJsonSchema = toJsonSchema(updateSpendingLimitSchema);
export const listSpendingLimitsQueryJsonSchema = toJsonSchema(listSpendingLimitsSchema);

/**
 * Pre-computed JSON Response Envelope Schemas
 */
export const spendingLimitEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: spendingLimitResponseSchema,
  })
);

export const paginatedSpendingLimitsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(spendingLimitResponseSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasMore: z.boolean(),
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
