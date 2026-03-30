import { z } from 'zod';

// ==================== PARAM SCHEMAS ====================

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const ruleParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  ruleId: z.string().uuid(),
});

export const suggestionParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  suggestionId: z.string().uuid(),
});

export const expenseParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  expenseId: z.string().uuid(),
});

// ==================== RULE SCHEMAS ====================

export const conditionTypeSchema = z.enum([
  'MERCHANT_CONTAINS',
  'MERCHANT_EQUALS',
  'AMOUNT_GREATER_THAN',
  'AMOUNT_LESS_THAN',
  'AMOUNT_EQUALS',
  'DESCRIPTION_CONTAINS',
  'PAYMENT_METHOD_EQUALS',
]);

export const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  priority: z.number().int().min(0).optional(),
  conditionType: conditionTypeSchema,
  conditionValue: z.string().min(1).max(255),
  targetCategoryId: z.string().uuid(),
});

export const updateRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  priority: z.number().int().min(0).optional(),
  conditionType: conditionTypeSchema.optional(),
  conditionValue: z.string().min(1).max(255).optional(),
  targetCategoryId: z.string().uuid().optional(),
});

export const ruleQuerySchema = z.object({
  activeOnly: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ==================== SUGGESTION SCHEMAS ====================

export const createSuggestionSchema = z.object({
  expenseId: z.string().uuid(),
  suggestedCategoryId: z.string().uuid(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(500).optional(),
});

export const suggestionQuerySchema = z.object({
  pendingOnly: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ==================== EXECUTION SCHEMAS ====================

export const evaluateRulesSchema = z.object({
  expenseId: z.string().uuid(),
  expenseData: z.object({
    merchant: z.string().optional(),
    description: z.string().optional(),
    amount: z.coerce.number().min(0),
    paymentMethod: z.string().optional(),
  }),
});

export const executionQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
