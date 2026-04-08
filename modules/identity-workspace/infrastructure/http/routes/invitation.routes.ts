import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { InvitationController } from '../controllers/invitation.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { requireRole } from '@shared/middleware/role-authorization.middleware';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  workspaceParamsSchema,
  invitationParamsSchema,
  tokenParamsSchema,
  inviteMemberSchema,
  paginationQuerySchema,
} from '../validation/workspace.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

// Shared Response Schema for Invitation
const invitationSchema = {
  type: 'object',
  properties: {
    invitationId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    role: { type: 'string' },
    token: { type: 'string' },
    expiresAt: { type: 'string', format: 'date-time' },
    acceptedAt: { type: 'string', format: 'date-time', nullable: true },
    isExpired: { type: 'boolean' },
    isAccepted: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

// Shared Response Schema for Membership (used in accept response)
const membershipSchema = {
  type: 'object',
  properties: {
    membershipId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    role: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// Shared Pagination Schema
const paginationSchema = {
  type: 'object',
  properties: {
    total: { type: 'integer' },
    limit: { type: 'integer' },
    offset: { type: 'integer' },
    hasMore: { type: 'boolean' },
  },
};

/**
 * Public invitation routes (no authentication required)
 * - GET /invitations/:token
 */
export async function registerPublicInvitationRoutes(
  fastify: FastifyInstance,
  controller: InvitationController
) {
  // Get invitation by token
  fastify.get(
    '/invitations/:token',
    {
      preHandler: [validateParams(tokenParamsSchema)],
      schema: {
        tags: ['Invitation'],
        description: 'Get invitation details by token',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
              data: invitationSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getInvitationByToken(request as AuthenticatedRequest, reply)
  );
}

/**
 * Token-based invitation routes (authenticated, no workspace auth)
 * - POST /invitations/:token/accept
 */
export async function registerTokenInvitationRoutes(
  fastify: FastifyInstance,
  controller: InvitationController
) {
  // Accept invitation
  fastify.post(
    '/invitations/:token/accept',
    {
      preHandler: [validateParams(tokenParamsSchema)],
      schema: {
        tags: ['Invitation'],
        description: 'Accept workspace invitation',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
              data: membershipSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.acceptInvitation(request as AuthenticatedRequest, reply)
  );
}

/**
 * Workspace-scoped invitation routes (with workspace authorization at route-level preHandler)
 * - POST /workspaces/:workspaceId/invitations (create invitation)
 * - GET /workspaces/:workspaceId/invitations (list pending invitations)
 * - DELETE /workspaces/:workspaceId/invitations/:invitationId (cancel invitation)
 */
export async function registerWorkspaceInvitationRoutes(
  fastify: FastifyInstance,
  controller: InvitationController,
  prisma: PrismaClient
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, prisma);
  };

  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create invitation for a workspace
  fastify.post(
    '/workspaces/:workspaceId/invitations',
    {
      preHandler: [
        validateParams(workspaceParamsSchema),
        validateBody(inviteMemberSchema),
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Invitation'],
        description: 'Create invitation for workspace',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['email', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'member'] },
            expiryHours: { type: 'number', minimum: 1, maximum: 720 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
              data: invitationSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.createInvitation(request as AuthenticatedRequest, reply)
  );

  // List workspace pending invitations
  fastify.get(
    '/workspaces/:workspaceId/invitations',
    {
      preHandler: [
        validateParams(workspaceParamsSchema),
        validateQuery(paginationQuerySchema),
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Invitation'],
        description: 'List workspace pending invitations',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: invitationSchema,
                  },
                  pagination: paginationSchema,
                },
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.listWorkspaceInvitations(
        request as AuthenticatedRequest,
        reply
      )
  );

  // Cancel invitation
  fastify.delete(
    '/workspaces/:workspaceId/invitations/:invitationId',
    {
      preHandler: [
        validateParams(invitationParamsSchema),
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Invitation'],
        description: 'Cancel workspace invitation',
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            description: 'Invitation cancelled successfully',
            type: 'null',
          },
        },
      },
    },
    (request, reply) =>
      controller.cancelInvitation(request as AuthenticatedRequest, reply)
  );
}
