import { z } from 'zod';
import { toJsonSchema } from './validator';

import { PLANNING_CONSTANTS } from '../../../domain/constants/planning.constants';

// ==================== PARAM SCHEMAS ====================

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const planParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  id: z.string().uuid(),
});

export const planIdParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  planId: z.string().uuid(),
});

export const forecastParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  id: z.string().uuid(),
});

export const forecastIdParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  forecastId: z.string().uuid(),
});

export const scenarioParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  id: z.string().uuid(),
});

export const forecastItemParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  itemId: z.string().uuid(),
});

// ==================== BUDGET PLAN SCHEMAS ====================

export const planStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']);
export const periodTypeSchema = z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']);

export const createBudgetPlanSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(PLANNING_CONSTANTS.NAME_MIN_LENGTH)
      .max(PLANNING_CONSTANTS.PLAN_NAME_MAX_LENGTH),
    description: z
      .string()
      .trim()
      .max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH)
      .nullable()
      .optional(),
    periodType: periodTypeSchema,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export const updateBudgetPlanSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(PLANNING_CONSTANTS.NAME_MIN_LENGTH)
      .max(PLANNING_CONSTANTS.PLAN_NAME_MAX_LENGTH)
      .optional(),
    description: z
      .string()
      .trim()
      .max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH)
      .nullable()
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: 'At least one field (name or description) must be provided for update',
  });

export const budgetPlanQuerySchema = z.object({
  status: planStatusSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PLANNING_CONSTANTS.MAX_PAGE_LIMIT)
    .default(PLANNING_CONSTANTS.DEFAULT_PAGE_LIMIT)
    .optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

// ==================== FORECAST SCHEMAS ====================

export const forecastTypeSchema = z.enum(['BASELINE', 'OPTIMISTIC', 'PESSIMISTIC', 'CUSTOM']);

export const createForecastSchema = z.object({
  name: z
    .string()
    .trim()
    .min(PLANNING_CONSTANTS.NAME_MIN_LENGTH)
    .max(PLANNING_CONSTANTS.FORECAST_NAME_MAX_LENGTH),
  type: forecastTypeSchema,
});

export const addForecastItemSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.coerce
    .number()
    .min(PLANNING_CONSTANTS.MIN_AMOUNT)
    .max(PLANNING_CONSTANTS.MAX_AMOUNT)
    .refine(
      (val) => {
        if (!Number.isFinite(val)) return false;
        const parts = val.toString().split('.');
        return parts.length < 2 || parts[1].length <= 2;
      },
      { message: 'Amount cannot have more than 2 decimal places' }
    ),
  notes: z
    .string()
    .trim()
    .max(PLANNING_CONSTANTS.NOTES_MAX_LENGTH)
    .optional(),
});

export const forecastItemQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PLANNING_CONSTANTS.MAX_PAGE_LIMIT)
    .default(PLANNING_CONSTANTS.DEFAULT_PAGE_LIMIT)
    .optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

// ==================== SCENARIO SCHEMAS ====================

export const scenarioAssumptionsSchema = z
  .record(z.unknown())
  .refine(
    (val) => {
      if (val === null || val === undefined) return true;
      if (typeof val !== 'object' || Array.isArray(val)) return false;
      try {
        const str = JSON.stringify(val);
        if (!str) return false;
        for (const [, v] of Object.entries(val)) {
          if (typeof v === 'number' && (!Number.isFinite(v) || Number.isNaN(v))) {
            return false;
          }
        }
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Assumptions must be a valid JSON object with finite values' }
  )
  .nullable()
  .optional();

export const createScenarioSchema = z.object({
  name: z
    .string()
    .trim()
    .min(PLANNING_CONSTANTS.NAME_MIN_LENGTH)
    .max(PLANNING_CONSTANTS.SCENARIO_NAME_MAX_LENGTH),
  description: z
    .string()
    .trim()
    .max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH)
    .nullable()
    .optional(),
  assumptions: scenarioAssumptionsSchema,
});

export const updateScenarioSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(PLANNING_CONSTANTS.NAME_MIN_LENGTH)
      .max(PLANNING_CONSTANTS.SCENARIO_NAME_MAX_LENGTH)
      .optional(),
    description: z
      .string()
      .trim()
      .max(PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH)
      .nullable()
      .optional(),
    assumptions: scenarioAssumptionsSchema,
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.assumptions !== undefined,
    {
      message: 'At least one field (name, description, or assumptions) must be provided for update',
    }
  );

// ==================== RESPONSE SCHEMAS ====================

export const budgetPlanResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  periodType: periodTypeSchema,
  period: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
  status: planStatusSchema,
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const forecastResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  planId: z.string().uuid(),
  name: z.string(),
  type: forecastTypeSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const forecastItemResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  forecastId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.number(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const scenarioResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  planId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  assumptions: z.record(z.unknown()).nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ==================== INFERRED TYPES ====================

export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;
export type PlanParams = z.infer<typeof planParamsSchema>;
export type PlanIdParams = z.infer<typeof planIdParamsSchema>;
export type ForecastParams = z.infer<typeof forecastParamsSchema>;
export type ForecastIdParams = z.infer<typeof forecastIdParamsSchema>;
export type ScenarioParams = z.infer<typeof scenarioParamsSchema>;
export type ForecastItemParams = z.infer<typeof forecastItemParamsSchema>;

export type CreateBudgetPlanBody = z.infer<typeof createBudgetPlanSchema>;
export type UpdateBudgetPlanBody = z.infer<typeof updateBudgetPlanSchema>;
export type BudgetPlanQuery = z.infer<typeof budgetPlanQuerySchema>;

export type CreateForecastBody = z.infer<typeof createForecastSchema>;
export type AddForecastItemBody = z.infer<typeof addForecastItemSchema>;
export type ForecastItemQuery = z.infer<typeof forecastItemQuerySchema>;

export type CreateScenarioBody = z.infer<typeof createScenarioSchema>;
export type UpdateScenarioBody = z.infer<typeof updateScenarioSchema>;

// ==================== PRE-COMPUTED JSON SCHEMAS ====================

export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const planParamsJsonSchema = toJsonSchema(planParamsSchema);
export const planIdParamsJsonSchema = toJsonSchema(planIdParamsSchema);
export const forecastParamsJsonSchema = toJsonSchema(forecastParamsSchema);
export const forecastIdParamsJsonSchema = toJsonSchema(forecastIdParamsSchema);
export const scenarioParamsJsonSchema = toJsonSchema(scenarioParamsSchema);
export const forecastItemParamsJsonSchema = toJsonSchema(forecastItemParamsSchema);

export const createBudgetPlanBodyJsonSchema = (() => {
  const schema = toJsonSchema(createBudgetPlanSchema) as any;
  if (schema && schema.properties) {
    if (schema.properties.startDate) {
      delete schema.properties.startDate.format;
    }
    if (schema.properties.endDate) {
      delete schema.properties.endDate.format;
    }
  }
  return schema;
})();
export const updateBudgetPlanBodyJsonSchema = toJsonSchema(updateBudgetPlanSchema);
export const budgetPlanQueryJsonSchema = toJsonSchema(budgetPlanQuerySchema);

export const createForecastBodyJsonSchema = toJsonSchema(createForecastSchema);
export const addForecastItemBodyJsonSchema = toJsonSchema(addForecastItemSchema);
export const forecastItemQueryJsonSchema = toJsonSchema(forecastItemQuerySchema);

export const createScenarioBodyJsonSchema = toJsonSchema(createScenarioSchema);
export const updateScenarioBodyJsonSchema = toJsonSchema(updateScenarioSchema);

// ==================== ENVELOPE JSON SCHEMAS ====================

export const budgetPlanEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: budgetPlanResponseSchema,
  })
);

export const paginatedBudgetPlansEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(budgetPlanResponseSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasMore: z.boolean(),
    }),
  })
);

export const forecastEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: forecastResponseSchema,
  })
);

export const paginatedForecastsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(forecastResponseSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasMore: z.boolean(),
    }),
  })
);

export const forecastItemEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: forecastItemResponseSchema,
  })
);

export const paginatedForecastItemsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(forecastItemResponseSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasMore: z.boolean(),
    }),
  })
);

export const scenarioEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: scenarioResponseSchema,
  })
);

export const paginatedScenariosEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(scenarioResponseSchema),
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
