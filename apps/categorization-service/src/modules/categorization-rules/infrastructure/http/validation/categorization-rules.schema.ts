import { z } from 'zod';
import { toJsonSchema } from './validator';

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

// ==================== RESPONSE SCHEMAS ====================

export const categoryRuleResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  priority: z.number().int(),
  condition: z.object({
    type: z.string(),
    value: z.string(),
  }),
  targetCategoryId: z.string().uuid(),
  isActive: z.boolean(),
  createdBy: z.string().uuid(),
  createdAt: z.coerce.string(),
  updatedAt: z.coerce.string(),
});

export const categorySuggestionResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  expenseId: z.string().uuid(),
  suggestedCategoryId: z.string().uuid(),
  confidence: z.number(),
  reason: z.string().nullable(),
  isAccepted: z.boolean().nullable(),
  createdAt: z.coerce.string(),
  respondedAt: z.coerce.string().nullable(),
});

export const ruleExecutionResponseSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid(),
  expenseId: z.string().uuid(),
  appliedCategoryId: z.string().uuid(),
  executedAt: z.coerce.string(),
});

export const ruleEvaluationResponseSchema = z.object({
  appliedRule: z.object({
    id: z.string().uuid(),
    name: z.string(),
    priority: z.number().int(),
  }).nullable(),
  suggestedCategoryId: z.string().uuid().nullable(),
  execution: ruleExecutionResponseSchema.nullable(),
});

// ==================== INFERRED TYPES ====================

export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;
export type RuleParams = z.infer<typeof ruleParamsSchema>;
export type SuggestionParams = z.infer<typeof suggestionParamsSchema>;
export type ExpenseParams = z.infer<typeof expenseParamsSchema>;

export type CreateRuleBody = z.infer<typeof createRuleSchema>;
export type UpdateRuleBody = z.infer<typeof updateRuleSchema>;
export type RuleQuery = z.infer<typeof ruleQuerySchema>;

export type CreateSuggestionBody = z.infer<typeof createSuggestionSchema>;
export type SuggestionQuery = z.infer<typeof suggestionQuerySchema>;

export type EvaluateRulesBody = z.infer<typeof evaluateRulesSchema>;
export type ExecutionQuery = z.infer<typeof executionQuerySchema>;

// ==================== PRE-COMPUTED JSON SCHEMAS ====================

export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const ruleParamsJsonSchema = toJsonSchema(ruleParamsSchema);
export const suggestionParamsJsonSchema = toJsonSchema(suggestionParamsSchema);
export const expenseParamsJsonSchema = toJsonSchema(expenseParamsSchema);

export const createRuleBodyJsonSchema = toJsonSchema(createRuleSchema);
export const updateRuleBodyJsonSchema = toJsonSchema(updateRuleSchema);
export const ruleQueryJsonSchema = toJsonSchema(ruleQuerySchema);

export const createSuggestionBodyJsonSchema = toJsonSchema(createSuggestionSchema);
export const suggestionQueryJsonSchema = toJsonSchema(suggestionQuerySchema);

export const evaluateRulesBodyJsonSchema = toJsonSchema(evaluateRulesSchema);
export const executionQueryJsonSchema = toJsonSchema(executionQuerySchema);

// ==================== ENVELOPE JSON SCHEMAS ====================

export const ruleEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: categoryRuleResponseSchema,
  })
);

export const paginatedRulesEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(categoryRuleResponseSchema),
      pagination: z.object({
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
        hasMore: z.boolean(),
      }),
    }),
  })
);

export const suggestionEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: categorySuggestionResponseSchema,
  })
);

export const paginatedSuggestionsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(categorySuggestionResponseSchema),
      pagination: z.object({
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
        hasMore: z.boolean(),
      }),
    }),
  })
);

export const suggestionListEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.array(categorySuggestionResponseSchema),
  })
);

export const executionEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: ruleExecutionResponseSchema,
  })
);

export const paginatedExecutionsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(ruleExecutionResponseSchema),
      pagination: z.object({
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
        hasMore: z.boolean(),
      }),
    }),
  })
);

export const executionListEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.array(ruleExecutionResponseSchema),
  })
);

export const evaluationEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: ruleEvaluationResponseSchema,
  })
);

export const baseResponseEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
  })
);
