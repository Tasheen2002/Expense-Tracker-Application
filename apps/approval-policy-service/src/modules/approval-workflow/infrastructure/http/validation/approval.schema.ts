import { z } from "zod";
import { toJsonSchema } from "./validator";

// ==================== APPROVAL CHAIN SCHEMAS ====================

export const createChainSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  requiresReceipt: z.boolean(),
  approverSequence: z.array(z.string().uuid()).min(1),
});

export const updateChainSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  requiresReceipt: z.boolean().optional(),
  approverSequence: z.array(z.string().uuid()).min(1).optional(),
});

export const paginationSchema = z.object({
  limit: z.string().regex(/^[0-9]+$/).optional().default("50").transform((val) => parseInt(val, 10)),
  offset: z.string().regex(/^[0-9]+$/).optional().default("0").transform((val) => parseInt(val, 10)),
});

export const listChainsSchema = paginationSchema.extend({
  activeOnly: z.enum(["true", "false"]).optional().default("false").transform((val) => val === "true"),
});

// ==================== WORKFLOW SCHEMAS ====================

export const initiateWorkflowSchema = z.object({
  expenseId: z.string().uuid(),
  amount: z.number().min(0.01),
  categoryId: z.string().uuid().optional(),
  hasReceipt: z.boolean(),
});

export const approveStepSchema = z.object({
  comments: z.string().optional(),
});

export const rejectStepSchema = z.object({
  comments: z.string().min(1),
});

export const delegateStepSchema = z.object({
  toUserId: z.string().uuid(),
});

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const workflowParamsSchema = workspaceParamsSchema.extend({
  expenseId: z.string().uuid(),
});

export const chainParamsSchema = workspaceParamsSchema.extend({
  chainId: z.string().uuid(),
});

export type CreateChainBody = z.infer<typeof createChainSchema>;
export type UpdateChainBody = z.infer<typeof updateChainSchema>;
export type ListChainsQuery = z.infer<typeof listChainsSchema>;
export type InitiateWorkflowBody = z.infer<typeof initiateWorkflowSchema>;
export type ApproveStepBody = z.infer<typeof approveStepSchema>;
export type RejectStepBody = z.infer<typeof rejectStepSchema>;
export type DelegateStepBody = z.infer<typeof delegateStepSchema>;
export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;
export type WorkflowParams = z.infer<typeof workflowParamsSchema>;
export type ChainParams = z.infer<typeof chainParamsSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;

// ==================== RESPONSE SCHEMAS (ZOD) ====================

export const approvalChainResponseSchema = z.object({
  chainId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  minAmount: z.number().nullable().optional(),
  maxAmount: z.number().nullable().optional(),
  categoryIds: z.array(z.string().uuid()).nullable().optional(),
  requiresReceipt: z.boolean(),
  approverSequence: z.array(z.string().uuid()),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const approvalStepResponseSchema = z.object({
  stepId: z.string().uuid(),
  workflowId: z.string().uuid(),
  stepNumber: z.number(),
  approverId: z.string().uuid(),
  delegatedTo: z.string().uuid().nullable().optional(),
  status: z.string(),
  comments: z.string().nullable().optional(),
  processedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workflowResponseSchema = z.object({
  workflowId: z.string().uuid(),
  expenseId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  chainId: z.string().uuid().nullable().optional(),
  status: z.string(),
  currentStepNumber: z.number(),
  steps: z.array(approvalStepResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable().optional(),
});

// ==================== PRE-COMPUTED JSON SCHEMAS ====================

export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const chainParamsJsonSchema = toJsonSchema(chainParamsSchema);
export const workflowParamsJsonSchema = toJsonSchema(workflowParamsSchema);
export const createChainBodyJsonSchema = toJsonSchema(createChainSchema);
export const updateChainBodyJsonSchema = toJsonSchema(updateChainSchema);
export const listChainsQueryJsonSchema = toJsonSchema(listChainsSchema);
export const initiateWorkflowBodyJsonSchema = toJsonSchema(initiateWorkflowSchema);
export const approveStepBodyJsonSchema = toJsonSchema(approveStepSchema);
export const rejectStepBodyJsonSchema = toJsonSchema(rejectStepSchema);
export const delegateStepBodyJsonSchema = toJsonSchema(delegateStepSchema);
export const paginationQueryJsonSchema = toJsonSchema(paginationSchema);

// ==================== RESPONSE ENVELOPES ====================

export const chainEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: approvalChainResponseSchema,
  })
);

export const paginatedChainsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(approvalChainResponseSchema),
      pagination: z.object({
        total: z.number().int(),
        limit: z.number().int(),
        offset: z.number().int(),
        hasMore: z.boolean(),
      }),
    }),
  })
);

export const workflowEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: workflowResponseSchema,
  })
);

export const paginatedWorkflowsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(workflowResponseSchema),
      pagination: z.object({
        total: z.number().int(),
        limit: z.number().int(),
        offset: z.number().int(),
        hasMore: z.boolean(),
      }),
    }),
  })
);

export const updateChainEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      chainId: z.string().uuid(),
    }),
  })
);

export const expenseEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      expenseId: z.string().uuid(),
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
