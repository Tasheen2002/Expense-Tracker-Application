import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MemberController } from '../controllers/member.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
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
  controller: MemberController
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(
      request as AuthenticatedRequest,
      reply,
      request.server.prisma
    );
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(paginationQuerySchema),
        workspaceAuth,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updateMemberRoleSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
