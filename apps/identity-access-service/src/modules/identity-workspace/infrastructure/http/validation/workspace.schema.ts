import { z } from 'zod';
import {
  WORKSPACE_NAME_MIN_LENGTH,
  WORKSPACE_NAME_MAX_LENGTH,
} from '../../../domain/constants/identity.constants';
import { toJsonSchema } from './validator';

/**
 * Params Schemas
 */
export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
});
export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;

export const memberParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  userId: z.string().uuid('Invalid user ID'),
});
export type MemberParams = z.infer<typeof memberParamsSchema>;

export const invitationParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  invitationId: z.string().uuid('Invalid invitation ID'),
});
export type InvitationParams = z.infer<typeof invitationParamsSchema>;

export const tokenParamsSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});
export type TokenParams = z.infer<typeof tokenParamsSchema>;

/**
 * Query Schemas
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

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

/**
 * Response Schemas
 */
export const workspaceResponseSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  ownerId: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workspaceMembershipResponseSchema = z.object({
  membershipId: z.string().uuid(),
  userId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  role: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workspaceInvitationResponseSchema = z.object({
  invitationId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: z.string(),
  token: z.string(),
  expiresAt: z.string(),
  acceptedAt: z.string().nullable(),
  isExpired: z.boolean(),
  isAccepted: z.boolean(),
  isCancelled: z.boolean(),
  createdAt: z.string(),
});

// Pre-computed JSON schemas for routes
export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const memberParamsJsonSchema = toJsonSchema(memberParamsSchema);
export const invitationParamsJsonSchema = toJsonSchema(invitationParamsSchema);
export const tokenParamsJsonSchema = toJsonSchema(tokenParamsSchema);
export const paginationQueryJsonSchema = toJsonSchema(paginationQuerySchema);

export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid('Invalid user ID'),
});

export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;

export const createWorkspaceBodyJsonSchema = toJsonSchema(createWorkspaceSchema);
export const updateWorkspaceBodyJsonSchema = toJsonSchema(updateWorkspaceSchema);
export const addMemberBodyJsonSchema = toJsonSchema(addMemberSchema);
export const updateMemberRoleBodyJsonSchema = toJsonSchema(updateMemberRoleSchema);
export const inviteMemberBodyJsonSchema = toJsonSchema(inviteMemberSchema);
export const transferOwnershipBodyJsonSchema = toJsonSchema(transferOwnershipSchema);

// Response envelopes
export const workspaceEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: workspaceResponseSchema,
  })
);

export const workspaceListEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(workspaceResponseSchema),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
      hasMore: z.boolean(),
    }),
  })
);

export const membershipEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: workspaceMembershipResponseSchema,
  })
);

export const membershipListEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(workspaceMembershipResponseSchema),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
      hasMore: z.boolean(),
    }),
  })
);

export const invitationEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: workspaceInvitationResponseSchema,
  })
);

export const invitationListEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(workspaceInvitationResponseSchema),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
      hasMore: z.boolean(),
    }),
  })
);
