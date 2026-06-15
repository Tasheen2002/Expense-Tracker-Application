import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { MemberController } from '../controllers/member.controller';
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
  memberParamsSchema,
  updateMemberRoleSchema,
  paginationQuerySchema,
  workspaceParamsJsonSchema,
  memberParamsJsonSchema,
  updateMemberRoleBodyJsonSchema,
  paginationQueryJsonSchema,
  membershipEnvelopeJsonSchema,
  membershipListEnvelopeJsonSchema,
} from '../validation/workspace.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function registerMemberRoutes(
  fastify: FastifyInstance,
  controller: MemberController,
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

  // List workspace members
  fastify.get(
    '/workspaces/:workspaceId/members',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Member'],
        description: 'List workspace members',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: membershipListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listMembers(request as AuthenticatedRequest, reply)
  );

  // Remove member from workspace
  fastify.delete(
    '/workspaces/:workspaceId/members/:userId',
    {
      preValidation: [validateParams(memberParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Member'],
        description: 'Remove member from workspace',
        security: [{ bearerAuth: [] }],
        params: memberParamsJsonSchema,
        response: {
          204: {
            description: 'Member removed successfully',
            type: 'null',
          },
        },
      },
    },
    (request, reply) =>
      controller.removeMember(request as AuthenticatedRequest, reply)
  );

  // Change member role
  fastify.patch(
    '/workspaces/:workspaceId/members/:userId/role',
    {
      preValidation: [validateParams(memberParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
        validateBody(updateMemberRoleSchema),
      ],
      schema: {
        tags: ['Member'],
        description: 'Change member role',
        security: [{ bearerAuth: [] }],
        params: memberParamsJsonSchema,
        body: updateMemberRoleBodyJsonSchema,
        response: {
          200: membershipEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.changeRole(request as AuthenticatedRequest, reply)
  );
}
