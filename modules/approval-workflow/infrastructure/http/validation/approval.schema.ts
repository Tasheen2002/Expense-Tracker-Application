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
  isActive: z.boolean().optional(),
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

