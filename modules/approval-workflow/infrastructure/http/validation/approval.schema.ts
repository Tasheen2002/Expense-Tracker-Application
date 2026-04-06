import { z } from "zod";

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

// ==================== API RESPONSE SCHEMAS (JSON Schema) ====================

export const chainResponseSchema = {
  type: 'object',
  properties: {
    chainId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    minAmount: { type: 'number', nullable: true },
    maxAmount: { type: 'number', nullable: true },
    categoryIds: {
      type: 'array',
      items: { type: 'string', format: 'uuid' },
      nullable: true,
    },
    requiresReceipt: { type: 'boolean' },
    approverSequence: {
      type: 'array',
      items: { type: 'string', format: 'uuid' },
    },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const paginatedChainsResponseSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: chainResponseSchema,
    },
    pagination: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
        hasMore: { type: 'boolean' },
      },
    },
  },
};

export const approvalStepSchema = {
  type: 'object',
  properties: {
    stepId: { type: 'string', format: 'uuid' },
    workflowId: { type: 'string', format: 'uuid' },
    stepNumber: { type: 'number' },
    approverId: { type: 'string', format: 'uuid' },
    delegatedTo: { type: 'string', format: 'uuid', nullable: true },
    status: { type: 'string' },
    comments: { type: 'string', nullable: true },
    processedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const workflowSchema = {
  type: 'object',
  properties: {
    workflowId: { type: 'string', format: 'uuid' },
    expenseId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    chainId: { type: 'string', format: 'uuid', nullable: true },
    status: { type: 'string' },
    currentStepNumber: { type: 'number' },
    steps: {
      type: 'array',
      items: approvalStepSchema,
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

export const paginatedWorkflowsResponseSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: workflowSchema,
    },
    pagination: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
        hasMore: { type: 'boolean' },
      },
    },
  },
};
