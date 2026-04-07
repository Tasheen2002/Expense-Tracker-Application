import { z } from 'zod';
import { BudgetPeriodType } from '../../../domain/enums/budget-period-type';

/**
 * Route Params Schemas
 */
export const spendingLimitWorkspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
});

export const spendingLimitParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  limitId: z.string().uuid('Invalid spending limit ID format'),
});

export const createSpendingLimitSchema = z.object({
  userId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  limitAmount: z.union([z.number().positive(), z.string()]),
  currency: z.string().length(3),
  periodType: z.nativeEnum(BudgetPeriodType),
});

export const updateSpendingLimitSchema = z
  .object({
    userId: z.string().uuid().optional(),
    limitAmount: z.union([z.number().positive(), z.string()]).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one spending limit field must be provided',
  });
