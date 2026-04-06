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
  assumptions: z.record(z.unknown()).optional(),
});

export const updateScenarioSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  assumptions: z.record(z.unknown()).optional(),
});

// ==================== RESPONSE SCHEMAS (JSON Schema for Fastify) ====================

export const budgetPlanResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    periodType: { type: 'string', enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'] },
    period: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
      },
    },
    status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] },
    createdBy: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const paginatedBudgetPlansResponseSchema = {
  type: 'object',
  properties: {
    items: { type: 'array', items: budgetPlanResponseSchema },
    total: { type: 'number' },
    limit: { type: 'number' },
    offset: { type: 'number' },
    hasMore: { type: 'boolean' },
  },
};

export const forecastResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    planId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    type: { type: 'string', enum: ['BASELINE', 'OPTIMISTIC', 'PESSIMISTIC', 'CUSTOM'] },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const forecastItemResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    forecastId: { type: 'string', format: 'uuid' },
    categoryId: { type: 'string', format: 'uuid' },
    amount: { type: 'number' },
    notes: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const paginatedForecastsResponseSchema = {
  type: 'object',
  properties: {
    items: { type: 'array', items: forecastResponseSchema },
    total: { type: 'number' },
    limit: { type: 'number' },
    offset: { type: 'number' },
    hasMore: { type: 'boolean' },
  },
};

export const paginatedForecastItemsResponseSchema = {
  type: 'object',
  properties: {
    items: { type: 'array', items: forecastItemResponseSchema },
    total: { type: 'number' },
    limit: { type: 'number' },
    offset: { type: 'number' },
    hasMore: { type: 'boolean' },
  },
};

export const scenarioResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    planId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    assumptions: { type: 'object', nullable: true },
    createdBy: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const paginatedScenariosResponseSchema = {
  type: 'object',
  properties: {
    items: { type: 'array', items: scenarioResponseSchema },
    total: { type: 'number' },
    limit: { type: 'number' },
    offset: { type: 'number' },
    hasMore: { type: 'boolean' },
  },
};
