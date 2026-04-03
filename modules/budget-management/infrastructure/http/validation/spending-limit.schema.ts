import { z } from 'zod';
import { BudgetPeriodType } from '../../../domain/enums/budget-period-type';

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
