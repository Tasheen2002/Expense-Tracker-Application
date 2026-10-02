import { z } from 'zod';
import {
  BUDGET_NAME_MIN_LENGTH,
  BUDGET_NAME_MAX_LENGTH,
  BUDGET_DESCRIPTION_MAX_LENGTH,
  MIN_BUDGET_AMOUNT,
  MIN_ALLOCATION_AMOUNT,
  MAX_BUDGET_AMOUNT,
  ALLOCATION_DESCRIPTION_MAX_LENGTH,
  SUPPORTED_CURRENCIES,
} from '../../../domain/constants/budget.constants';
import { BudgetPeriodType } from '../../../domain/enums/budget-period-type';
import { BudgetStatus } from '../../../domain/enums/budget-status';
import { toJsonSchema } from './validator';
import Decimal from 'decimal.js';

const hasCentPrecision = (amount: number): boolean => new Decimal(amount).decimalPlaces() <= 2;
const offsetSchema = z.string().regex(/^(0|[1-9]\d*)$/).transform(Number)
  .pipe(z.number().int().min(0).max(2_147_483_647));

/**
 * Route Params Schemas
 */
export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
});
export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;
export const alertParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  alertId: z.string().uuid('Invalid alert ID format'),
});
export type AlertParams = z.infer<typeof alertParamsSchema>;

export const budgetParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  budgetId: z.string().uuid('Invalid budget ID format'),
});
export type BudgetParams = z.infer<typeof budgetParamsSchema>;

export const allocationParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  budgetId: z.string().uuid('Invalid budget ID format'),
  allocationId: z.string().uuid('Invalid allocation ID format'),
});
export type AllocationParams = z.infer<typeof allocationParamsSchema>;

/**
 * Body & Query Schemas
 */
export const createBudgetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(BUDGET_NAME_MIN_LENGTH, 'Budget name is required')
    .max(
      BUDGET_NAME_MAX_LENGTH,
      `Budget name cannot exceed ${BUDGET_NAME_MAX_LENGTH} characters`
    ),
  description: z
    .string()
    .max(
      BUDGET_DESCRIPTION_MAX_LENGTH,
      `Description cannot exceed ${BUDGET_DESCRIPTION_MAX_LENGTH} characters`
    )
    .optional(),
  totalAmount: z
    .number()
    .min(
      MIN_BUDGET_AMOUNT,
      `Total amount must be at least ${MIN_BUDGET_AMOUNT}`
    )
    .max(MAX_BUDGET_AMOUNT, `Total amount cannot exceed ${MAX_BUDGET_AMOUNT}`)
    .refine(hasCentPrecision, 'Total amount must have at most two decimal places'),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .transform((value) => value.toUpperCase())
    .refine((val) => SUPPORTED_CURRENCIES.includes(val), {
      message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
    }),
  periodType: z.nativeEnum(BudgetPeriodType),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format').optional(),
  isRecurring: z.boolean().default(false),
  rolloverUnused: z.boolean().default(false),
}).strict().superRefine((data, context) => {
  if (data.rolloverUnused && !data.isRecurring) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rolloverUnused'],
      message: 'Rollover requires a recurring budget',
    });
  }
  if (data.periodType === BudgetPeriodType.CUSTOM && !data.endDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'Custom periods require an end date',
    });
  }
  if (data.periodType !== BudgetPeriodType.CUSTOM && data.endDate !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'Only custom periods accept an explicit end date',
    });
  }
});
export type CreateBudgetBody = z.infer<typeof createBudgetSchema>;

export const updateBudgetSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(BUDGET_NAME_MIN_LENGTH)
      .max(BUDGET_NAME_MAX_LENGTH)
      .optional(),
    description: z
      .string()
      .max(BUDGET_DESCRIPTION_MAX_LENGTH)
      .optional()
      .nullable(),
    totalAmount: z
      .number()
      .min(MIN_BUDGET_AMOUNT)
      .max(MAX_BUDGET_AMOUNT)
      .refine(hasCentPrecision, 'Total amount must have at most two decimal places')
      .optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one budget field must be provided',
  });
export type UpdateBudgetBody = z.infer<typeof updateBudgetSchema>;

export const addAllocationSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID format').optional(),
  allocatedAmount: z
    .number()
    .min(
      MIN_ALLOCATION_AMOUNT,
      `Allocated amount must be at least ${MIN_ALLOCATION_AMOUNT}`
    )
    .max(
      MAX_BUDGET_AMOUNT,
      `Allocated amount cannot exceed ${MAX_BUDGET_AMOUNT}`
    )
    .refine(hasCentPrecision, 'Allocated amount must have at most two decimal places'),
  description: z
    .string()
    .max(
      ALLOCATION_DESCRIPTION_MAX_LENGTH,
      `Description cannot exceed ${ALLOCATION_DESCRIPTION_MAX_LENGTH} characters`
    )
    .optional(),
}).strict();
export type AddAllocationBody = z.infer<typeof addAllocationSchema>;

export const updateAllocationSchema = z
  .object({
    allocatedAmount: z
      .number()
      .min(MIN_ALLOCATION_AMOUNT)
      .max(MAX_BUDGET_AMOUNT)
      .refine(hasCentPrecision, 'Allocated amount must have at most two decimal places')
      .optional(),
    description: z
      .string()
      .max(ALLOCATION_DESCRIPTION_MAX_LENGTH)
      .optional()
      .nullable(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one allocation field must be provided',
  });
export type UpdateAllocationBody = z.infer<typeof updateAllocationSchema>;

export const listBudgetsSchema = z.object({
  status: z.nativeEnum(BudgetStatus).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  createdBy: z.string().uuid().optional(),
  currency: z
    .string()
    .length(3)
    .refine((val) => SUPPORTED_CURRENCIES.includes(val))
    .optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  offset: offsetSchema.optional(),
}).strict();
export type ListBudgetsQuery = z.infer<typeof listBudgetsSchema>;

export const paginationQuerySchema = z.object({
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  offset: offsetSchema.optional(),
}).strict();
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Response DTO Schemas
 */
export const budgetResponseSchema = z.object({
  budgetId: z.string().uuid(),
  workspaceId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  totalAmount: z.string(),
  currency: z.string(),
  period: z.object({
    startDate: z.string(),
    endDate: z.string().nullable(),
    type: z.string(),
  }),
  status: z.string(),
  createdBy: z.string(),
  isRecurring: z.boolean(),
  rolloverUnused: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const budgetAllocationResponseSchema = z.object({
  allocationId: z.string().uuid(),
  budgetId: z.string(),
  categoryId: z.string().nullable(),
  allocatedAmount: z.string(),
  spentAmount: z.string(),
  description: z.string().nullable(),
  remainingAmount: z.string(),
  spentPercentage: z.number(),
  isOverBudget: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const budgetAlertResponseSchema = z.object({
  id: z.string().uuid(),
  budgetId: z.string(),
  allocationId: z.string().nullable(),
  level: z.string(),
  threshold: z.string(),
  currentSpent: z.string(),
  allocatedAmount: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  notifiedAt: z.string().nullable(),
  createdAt: z.string(),
});

/**
 * Pre-computed JSON Validation Schemas
 */
export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const alertParamsJsonSchema = toJsonSchema(alertParamsSchema);
export const budgetParamsJsonSchema = toJsonSchema(budgetParamsSchema);
export const allocationParamsJsonSchema = toJsonSchema(allocationParamsSchema);
export const createBudgetBodyJsonSchema = toJsonSchema(createBudgetSchema);
export const updateBudgetBodyJsonSchema = toJsonSchema(updateBudgetSchema);
export const addAllocationBodyJsonSchema = toJsonSchema(addAllocationSchema);
export const updateAllocationBodyJsonSchema = toJsonSchema(updateAllocationSchema);
export const listBudgetsQueryJsonSchema = toJsonSchema(listBudgetsSchema);

/**
 * Pre-computed JSON Response Envelope Schemas
 */
export const budgetEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: budgetResponseSchema,
  })
);

export const paginatedBudgetsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(budgetResponseSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasMore: z.boolean(),
    }),
  })
);

export const budgetAllocationEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: budgetAllocationResponseSchema,
  })
);

export const paginatedAllocationsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(budgetAllocationResponseSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasMore: z.boolean(),
    }),
  })
);

export const paginatedAlertsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(budgetAlertResponseSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasMore: z.boolean(),
    }),
  })
);
export const budgetAlertEnvelopeJsonSchema = toJsonSchema(z.object({
  success: z.boolean(),
  statusCode: z.number(),
  message: z.string(),
  data: budgetAlertResponseSchema,
}));

export const baseResponseEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
  })
);

export const paginationQueryJsonSchema = toJsonSchema(paginationQuerySchema);
