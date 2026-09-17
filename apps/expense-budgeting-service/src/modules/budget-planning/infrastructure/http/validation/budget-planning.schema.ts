import { z } from 'zod';
import { toJsonSchema } from './validator';

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

export const createBudgetPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  periodType: periodTypeSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const updateBudgetPlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
});

export const budgetPlanQuerySchema = z.object({
  status: planStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ==================== FORECAST SCHEMAS ====================

export const forecastTypeSchema = z.enum(['BASELINE', 'OPTIMISTIC', 'PESSIMISTIC', 'CUSTOM']);

export const createForecastSchema = z.object({
  name: z.string().min(1).max(100),
  type: forecastTypeSchema,
});

export const addForecastItemSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.coerce.number().min(0),
  notes: z.string().max(500).optional(),
});

// ==================== SCENARIO SCHEMAS ====================

export const createScenarioSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  assumptions: z.record(z.unknown()).optional(),
});

export const updateScenarioSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  assumptions: z.record(z.unknown()).optional(),
});

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
  planId: z.string().uuid(),
  name: z.string(),
  type: forecastTypeSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const forecastItemResponseSchema = z.object({
  id: z.string().uuid(),
  forecastId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.number(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const scenarioResponseSchema = z.object({
  id: z.string().uuid(),
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
      schema.properties.startDate.format = 'date';
    }
    if (schema.properties.endDate) {
      schema.properties.endDate.format = 'date';
    }
  }
  return schema;
})();
export const updateBudgetPlanBodyJsonSchema = toJsonSchema(updateBudgetPlanSchema);
export const budgetPlanQueryJsonSchema = toJsonSchema(budgetPlanQuerySchema);

export const createForecastBodyJsonSchema = toJsonSchema(createForecastSchema);
export const addForecastItemBodyJsonSchema = toJsonSchema(addForecastItemSchema);

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
