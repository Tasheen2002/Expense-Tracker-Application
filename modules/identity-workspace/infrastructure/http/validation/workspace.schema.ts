import { z } from 'zod'
import {
  WORKSPACE_NAME_MIN_LENGTH,
  WORKSPACE_NAME_MAX_LENGTH,
  WORKSPACE_SLUG_MIN_LENGTH,
  WORKSPACE_SLUG_MAX_LENGTH,
  WORKSPACE_SLUG_REGEX,
} from '../../../domain/constants/identity.constants'

/**
 * Create Workspace Schema
 */
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(WORKSPACE_NAME_MIN_LENGTH, 'Workspace name is required')
    .max(WORKSPACE_NAME_MAX_LENGTH, `Workspace name cannot exceed ${WORKSPACE_NAME_MAX_LENGTH} characters`),
  slug: z
    .string()
    .min(WORKSPACE_SLUG_MIN_LENGTH, 'Workspace slug is required')
    .max(WORKSPACE_SLUG_MAX_LENGTH, `Workspace slug cannot exceed ${WORKSPACE_SLUG_MAX_LENGTH} characters`)
    .regex(WORKSPACE_SLUG_REGEX, 'Slug must contain only lowercase letters, numbers, and hyphens'),
})

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>

/**
 * Update Workspace Schema
 */
export const updateWorkspaceSchema = z.object({
  name: z.string().min(WORKSPACE_NAME_MIN_LENGTH).max(WORKSPACE_NAME_MAX_LENGTH).optional(),
  isActive: z.boolean().optional(),
})

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>

/**
 * Add Member Schema
 */
export const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['owner', 'admin', 'member']),
})

export type AddMemberInput = z.infer<typeof addMemberSchema>

/**
 * Update Member Role Schema
 */
export const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
})

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>

/**
 * Invite Member Schema
 */
export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['admin', 'member']), // Cannot invite as owner
})

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
