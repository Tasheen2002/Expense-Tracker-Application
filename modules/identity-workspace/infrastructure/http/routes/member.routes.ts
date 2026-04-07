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
} from '../validation/workspace.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

// Shared Response Schema for Membership
const membershipSchema = {
  type: 'object',
  properties: {
    membershipId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
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
      preHandler: [
        validateParams(workspaceParamsSchema),
        validateQuery(paginationQuerySchema),
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Member'],
        description: 'List workspace members',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Members listed successfully',
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
                    items: membershipSchema,
                  },
                  pagination: paginationSchema,
                },
              },
            },
          },
          403: {
            description: 'Forbidden',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          404: {
            description: 'Workspace not found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
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
      preHandler: [
        validateParams(memberParamsSchema),
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Member'],
        description: 'Remove member from workspace',
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            description: 'Member removed successfully',
            type: 'null',
          },
          400: {
            description: 'Bad Request',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          403: {
            description: 'Forbidden',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          404: {
            description: 'Member not found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
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
      preHandler: [
        validateParams(memberParamsSchema),
        validateBody(updateMemberRoleSchema),
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Member'],
        description: 'Change member role',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['owner', 'admin', 'member'] },
          },
        },
        response: {
          200: {
            description: 'Member role updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
              data: membershipSchema,
            },
          },
          400: {
            description: 'Bad Request',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          403: {
            description: 'Forbidden',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          404: {
            description: 'Member not found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.changeRole(request as AuthenticatedRequest, reply)
  );
}
