import { z } from "zod";
import { toJsonSchema } from "./validator";
import {
  APPROVAL_CHAIN_NAME_MIN_LENGTH,
  APPROVAL_CHAIN_NAME_MAX_LENGTH,
  APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH,
  MIN_APPROVERS,
  MAX_APPROVERS,
  MIN_APPROVAL_AMOUNT,
  MAX_APPROVAL_AMOUNT,
  APPROVAL_COMMENTS_MAX_LENGTH,
  REJECTION_COMMENTS_MIN_LENGTH,
  REJECTION_COMMENTS_MAX_LENGTH,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  MIN_PAGE_OFFSET,
} from "../../../domain/constants";

// ==================== PARAMS SCHEMAS ====================

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID format"),
});

export const workflowParamsSchema = workspaceParamsSchema.extend({
  expenseId: z.string().uuid("Invalid expense ID format"),
});

export const chainParamsSchema = workspaceParamsSchema.extend({
  chainId: z.string().uuid("Invalid chain ID format"),
});

// ==================== QUERY / PAGINATION SCHEMAS ====================

export const paginationSchema = z.object({
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(MAX_PAGE_LIMIT, `Limit cannot exceed ${MAX_PAGE_LIMIT}`)
    .optional()
    .default(DEFAULT_PAGE_LIMIT),
  offset: z.coerce
    .number()
    .int("Offset must be an integer")
    .min(MIN_PAGE_OFFSET, "Offset cannot be negative")
    .optional()
    .default(MIN_PAGE_OFFSET),
});

export const listChainsSchema = paginationSchema.extend({
  activeOnly: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .default(false)
    .transform((val) => val === true || val === "true"),
});

// ==================== APPROVAL CHAIN SCHEMAS ====================

export const createChainSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(APPROVAL_CHAIN_NAME_MIN_LENGTH, "Approval chain name is required")
      .max(
        APPROVAL_CHAIN_NAME_MAX_LENGTH,
        `Approval chain name cannot exceed ${APPROVAL_CHAIN_NAME_MAX_LENGTH} characters`
      ),
    description: z
      .string()
      .trim()
      .max(
        APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH,
        `Description cannot exceed ${APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH} characters`
      )
      .optional(),
    minAmount: z
      .number()
      .min(MIN_APPROVAL_AMOUNT, `Minimum amount must be at least ${MIN_APPROVAL_AMOUNT}`)
      .max(MAX_APPROVAL_AMOUNT, `Minimum amount cannot exceed ${MAX_APPROVAL_AMOUNT}`)
      .optional(),
    maxAmount: z
      .number()
      .min(MIN_APPROVAL_AMOUNT, `Maximum amount must be at least ${MIN_APPROVAL_AMOUNT}`)
      .max(MAX_APPROVAL_AMOUNT, `Maximum amount cannot exceed ${MAX_APPROVAL_AMOUNT}`)
      .optional(),
    categoryIds: z.array(z.string().uuid("Invalid category ID format")).optional(),
    requiresReceipt: z.boolean(),
    approverSequence: z
      .array(z.string().uuid("Invalid approver ID format"))
      .min(MIN_APPROVERS, `Approver sequence must have at least ${MIN_APPROVERS} approver`)
      .max(MAX_APPROVERS, `Approver sequence cannot exceed ${MAX_APPROVERS} approvers`)
      .refine(
        (seq) => new Set(seq.map((id) => id.toLowerCase())).size === seq.length,
        { message: "Approver sequence cannot contain duplicate approvers" }
      ),
  })
  .refine(
    (data) =>
      data.minAmount === undefined ||
      data.maxAmount === undefined ||
      data.minAmount <= data.maxAmount,
    {
      message: "Minimum amount cannot be greater than maximum amount",
      path: ["minAmount"],
    }
  );

export const updateChainSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(APPROVAL_CHAIN_NAME_MIN_LENGTH, "Approval chain name cannot be empty")
      .max(
        APPROVAL_CHAIN_NAME_MAX_LENGTH,
        `Approval chain name cannot exceed ${APPROVAL_CHAIN_NAME_MAX_LENGTH} characters`
      )
      .optional(),
    description: z
      .string()
      .trim()
      .max(
        APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH,
        `Description cannot exceed ${APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH} characters`
      )
      .nullable()
      .optional(),
    minAmount: z
      .number()
      .min(MIN_APPROVAL_AMOUNT, `Minimum amount must be at least ${MIN_APPROVAL_AMOUNT}`)
      .max(MAX_APPROVAL_AMOUNT, `Minimum amount cannot exceed ${MAX_APPROVAL_AMOUNT}`)
      .nullable()
      .optional(),
    maxAmount: z
      .number()
      .min(MIN_APPROVAL_AMOUNT, `Maximum amount must be at least ${MIN_APPROVAL_AMOUNT}`)
      .max(MAX_APPROVAL_AMOUNT, `Maximum amount cannot exceed ${MAX_APPROVAL_AMOUNT}`)
      .nullable()
      .optional(),
    categoryIds: z.array(z.string().uuid("Invalid category ID format")).optional(),
    requiresReceipt: z.boolean().optional(),
    approverSequence: z
      .array(z.string().uuid("Invalid approver ID format"))
      .min(MIN_APPROVERS, `Approver sequence must have at least ${MIN_APPROVERS} approver`)
      .max(MAX_APPROVERS, `Approver sequence cannot exceed ${MAX_APPROVERS} approvers`)
      .refine(
        (seq) => new Set(seq.map((id) => id.toLowerCase())).size === seq.length,
        { message: "Approver sequence cannot contain duplicate approvers" }
      )
      .optional(),
  })
  .refine(
    (data) => Object.values(data).some((val) => val !== undefined),
    { message: "At least one field must be provided for update" }
  )
  .refine(
    (data) =>
      data.minAmount === undefined ||
      data.minAmount === null ||
      data.maxAmount === undefined ||
      data.maxAmount === null ||
      data.minAmount <= data.maxAmount,
    {
      message: "Minimum amount cannot be greater than maximum amount",
      path: ["minAmount"],
    }
  );

// ==================== WORKFLOW SCHEMAS ====================

export const initiateWorkflowSchema = z.object({
  expenseId: z.string().uuid("Invalid expense ID format"),
});

export const approveStepSchema = z.object({
  comments: z
    .string()
    .trim()
    .max(
      APPROVAL_COMMENTS_MAX_LENGTH,
      `Comments cannot exceed ${APPROVAL_COMMENTS_MAX_LENGTH} characters`
    )
    .optional(),
  expectedStepNumber: z
    .number()
    .int("Expected step number must be an integer")
    .positive("Expected step number must be a positive integer"),
});

export const rejectStepSchema = z.object({
  comments: z
    .string()
    .trim()
    .min(
      REJECTION_COMMENTS_MIN_LENGTH,
      "Rejection reason/comments are required"
    )
    .max(
      REJECTION_COMMENTS_MAX_LENGTH,
      `Rejection comments cannot exceed ${REJECTION_COMMENTS_MAX_LENGTH} characters`
    ),
});

export const delegateStepSchema = z.object({
  toUserId: z.string().uuid("Invalid target user ID format"),
});

export const cancelWorkflowSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .max(
        APPROVAL_COMMENTS_MAX_LENGTH,
        `Cancellation reason cannot exceed ${APPROVAL_COMMENTS_MAX_LENGTH} characters`
      )
      .optional(),
  })
  .optional();

// ==================== INFERRED TYPES ====================

export type CreateChainBody = z.infer<typeof createChainSchema>;
export type UpdateChainBody = z.infer<typeof updateChainSchema>;
export type ListChainsQuery = z.infer<typeof listChainsSchema>;
export type InitiateWorkflowBody = z.infer<typeof initiateWorkflowSchema>;
export type ApproveStepBody = z.infer<typeof approveStepSchema>;
export type RejectStepBody = z.infer<typeof rejectStepSchema>;
export type DelegateStepBody = z.infer<typeof delegateStepSchema>;
export type CancelWorkflowBody = z.infer<typeof cancelWorkflowSchema>;
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
  version: z.number().int(),
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
export const cancelWorkflowBodyJsonSchema = toJsonSchema(cancelWorkflowSchema);
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
