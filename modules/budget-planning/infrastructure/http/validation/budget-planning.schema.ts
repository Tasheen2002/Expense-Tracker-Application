import { z } from 'zod';

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
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
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
  assumptions: z.record(z.any()).optional(),
});
