import { z } from 'zod'
import {
  APPROVAL_COMMENTS_MAX_LENGTH,
  REJECTION_COMMENTS_MIN_LENGTH,
  REJECTION_COMMENTS_MAX_LENGTH,
  MIN_APPROVAL_AMOUNT,
} from '../../../domain/constants/approval-workflow.constants'

/**
 * Initiate Workflow Schema
 */
export const initiateWorkflowSchema = z.object({
  expenseId: z.string().uuid('Invalid expense ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  amount: z.number().min(MIN_APPROVAL_AMOUNT, `Amount must be at least ${MIN_APPROVAL_AMOUNT}`),
  categoryId: z.string().uuid('Invalid category ID format').optional(),
  hasReceipt: z.boolean(),
})

export type InitiateWorkflowInput = z.infer<typeof initiateWorkflowSchema>

/**
 * Approve Step Schema
 */
export const approveStepSchema = z.object({
  approverId: z.string().uuid('Invalid approver ID format'),
  comments: z
    .string()
    .max(APPROVAL_COMMENTS_MAX_LENGTH, `Comments cannot exceed ${APPROVAL_COMMENTS_MAX_LENGTH} characters`)
    .optional(),
})

export type ApproveStepInput = z.infer<typeof approveStepSchema>

/**
 * Reject Step Schema
 */
export const rejectStepSchema = z.object({
  approverId: z.string().uuid('Invalid approver ID format'),
  comments: z
    .string()
    .min(REJECTION_COMMENTS_MIN_LENGTH, 'Comments are required for rejection')
    .max(REJECTION_COMMENTS_MAX_LENGTH, `Comments cannot exceed ${REJECTION_COMMENTS_MAX_LENGTH} characters`),
})

export type RejectStepInput = z.infer<typeof rejectStepSchema>

/**
 * Delegate Step Schema
 */
export const delegateStepSchema = z.object({
  fromUserId: z.string().uuid('Invalid from user ID format'),
  toUserId: z.string().uuid('Invalid to user ID format'),
})

export type DelegateStepInput = z.infer<typeof delegateStepSchema>

/**
 * Workflow Params Schema
 */
export const workflowParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  expenseId: z.string().uuid('Invalid expense ID format'),
})

export type WorkflowParams = z.infer<typeof workflowParamsSchema>

/**
 * List Pending Approvals Query Schema
 */
export const listPendingApprovalsQuerySchema = z.object({
  approverId: z.string().uuid('Invalid approver ID format'),
})

export type ListPendingApprovalsQuery = z.infer<typeof listPendingApprovalsQuerySchema>

/**
 * List User Workflows Query Schema
 */
export const listUserWorkflowsQuerySchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

export type ListUserWorkflowsQuery = z.infer<typeof listUserWorkflowsQuerySchema>

/**
 * Workspace ID Param Schema (for list endpoints)
 */
export const workspaceIdParamSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
})

export type WorkspaceIdParam = z.infer<typeof workspaceIdParamSchema>
