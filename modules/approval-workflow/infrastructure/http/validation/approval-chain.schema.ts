import { z } from 'zod'
import {
  APPROVAL_CHAIN_NAME_MIN_LENGTH,
  APPROVAL_CHAIN_NAME_MAX_LENGTH,
  APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH,
  MIN_APPROVERS,
  MAX_APPROVERS,
  MIN_APPROVAL_AMOUNT,
  MAX_APPROVAL_AMOUNT,
} from '../../../domain/constants/approval-workflow.constants'

/**
 * Create Approval Chain Schema
 */
export const createApprovalChainSchema = z.object({
  name: z
    .string()
    .min(APPROVAL_CHAIN_NAME_MIN_LENGTH, 'Chain name is required')
    .max(APPROVAL_CHAIN_NAME_MAX_LENGTH, `Chain name cannot exceed ${APPROVAL_CHAIN_NAME_MAX_LENGTH} characters`),
  description: z
    .string()
    .max(APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH, `Description cannot exceed ${APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH} characters`)
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
  categoryIds: z.array(z.string().uuid('Invalid category ID format')).optional(),
  requiresReceipt: z.boolean(),
  approverSequence: z
    .array(z.string().uuid('Invalid approver ID format'))
    .min(MIN_APPROVERS, `At least ${MIN_APPROVERS} approver is required`)
    .max(MAX_APPROVERS, `Cannot exceed ${MAX_APPROVERS} approvers`),
})

export type CreateApprovalChainInput = z.infer<typeof createApprovalChainSchema>

/**
 * Update Approval Chain Schema
 */
export const updateApprovalChainSchema = z.object({
  name: z
    .string()
    .min(APPROVAL_CHAIN_NAME_MIN_LENGTH, 'Chain name is required')
    .max(APPROVAL_CHAIN_NAME_MAX_LENGTH, `Chain name cannot exceed ${APPROVAL_CHAIN_NAME_MAX_LENGTH} characters`)
    .optional(),
  description: z
    .string()
    .max(APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH, `Description cannot exceed ${APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH} characters`)
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
  approverSequence: z
    .array(z.string().uuid('Invalid approver ID format'))
    .min(MIN_APPROVERS, `At least ${MIN_APPROVERS} approver is required`)
    .max(MAX_APPROVERS, `Cannot exceed ${MAX_APPROVERS} approvers`)
    .optional(),
})

export type UpdateApprovalChainInput = z.infer<typeof updateApprovalChainSchema>

/**
 * List Approval Chains Query Schema
 */
export const listApprovalChainsQuerySchema = z.object({
  activeOnly: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),
})

export type ListApprovalChainsQuery = z.infer<typeof listApprovalChainsQuerySchema>

/**
 * Workspace ID Param Schema
 */
export const workspaceIdParamSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
})

export type WorkspaceIdParam = z.infer<typeof workspaceIdParamSchema>

/**
 * Chain ID Param Schema
 */
export const chainIdParamSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  chainId: z.string().uuid('Invalid chain ID format'),
})

export type ChainIdParam = z.infer<typeof chainIdParamSchema>
