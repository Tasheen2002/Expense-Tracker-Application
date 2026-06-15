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
  workspaceParamsJsonSchema,
  invitationParamsJsonSchema,
  tokenParamsJsonSchema,
  inviteMemberBodyJsonSchema,
  paginationQueryJsonSchema,
  invitationEnvelopeJsonSchema,
  membershipEnvelopeJsonSchema,
  invitationListEnvelopeJsonSchema,
} from '../validation/workspace.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

/**
 * Public invitation routes
 */
export async function registerPublicInvitationRoutes(
  fastify: FastifyInstance,
  controller: InvitationController
) {
  // Get invitation by token
  fastify.get(
    '/invitations/:token',
    {
      preValidation: [validateParams(tokenParamsSchema)],
      schema: {
        tags: ['Invitation'],
        description: 'Get invitation details by token',
        params: tokenParamsJsonSchema,
        response: {
          200: invitationEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getInvitationByToken(request as AuthenticatedRequest, reply)
  );
}

/**
 * Token-based invitation routes
 */
export async function registerTokenInvitationRoutes(
  fastify: FastifyInstance,
  controller: InvitationController
) {
  // Accept invitation
  fastify.post(
    '/invitations/:token/accept',
    {
      preValidation: [validateParams(tokenParamsSchema)],
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Invitation'],
        description: 'Accept workspace invitation',
        security: [{ bearerAuth: [] }],
        params: tokenParamsJsonSchema,
        response: {
          200: membershipEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.acceptInvitation(request as AuthenticatedRequest, reply)
  );
}

/**
 * Workspace-scoped invitation routes
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
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
        validateBody(inviteMemberSchema),
      ],
      schema: {
        tags: ['Invitation'],
        description: 'Create invitation for workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: inviteMemberBodyJsonSchema,
        response: {
          201: invitationEnvelopeJsonSchema,
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Invitation'],
        description: 'List workspace pending invitations',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: invitationListEnvelopeJsonSchema,
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
      preValidation: [validateParams(invitationParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Invitation'],
        description: 'Cancel workspace invitation',
        security: [{ bearerAuth: [] }],
        params: invitationParamsJsonSchema,
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
