import { z } from 'zod';
import {
  WORKSPACE_NAME_MIN_LENGTH,
  WORKSPACE_NAME_MAX_LENGTH,
} from '../../../domain/constants/identity.constants';

/**
 * Params Schemas
 */
export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

export const memberParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  userId: z.string().uuid('Invalid user ID'),
});

export const invitationParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  invitationId: z.string().uuid('Invalid invitation ID'),
});

export const tokenParamsSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * Query Schemas
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

/**
 * Create Workspace Schema
 */
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(WORKSPACE_NAME_MIN_LENGTH, 'Workspace name is required')
    .max(
      WORKSPACE_NAME_MAX_LENGTH,
      `Workspace name cannot exceed ${WORKSPACE_NAME_MAX_LENGTH} characters`
    ),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

/**
 * Update Workspace Schema
 */
export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(WORKSPACE_NAME_MIN_LENGTH)
    .max(WORKSPACE_NAME_MAX_LENGTH)
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

/**
 * Add Member Schema
 */
export const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['owner', 'admin', 'member']),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

/**
 * Update Member Role Schema
 */
export const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

/**
 * Invite Member Schema
 */
export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['admin', 'member']), // Cannot invite as owner
  expiryHours: z.number().int().min(1).max(720).optional(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
