import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { WorkspaceController } from '../controllers/workspace.controller';
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
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceParamsSchema,
  paginationQuerySchema,
} from '../validation/workspace.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

// Shared Response Schema for Workspace
const workspaceSchema = {
  type: 'object',
  properties: {
    workspaceId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    slug: { type: 'string' },
    ownerId: { type: 'string', format: 'uuid' },
    isActive: { type: 'boolean' },
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
 * User-level workspace routes (no workspace authorization middleware)
 * - POST /workspaces (create)
 * - GET /workspaces (list user's workspaces)
 */
export async function registerUserWorkspaceRoutes(
  fastify: FastifyInstance,
  controller: WorkspaceController
) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create workspace
  fastify.post(
    '/workspaces',
    {
      preHandler: [validateBody(createWorkspaceSchema)],
      schema: {
        tags: ['Workspace'],
        description: 'Create a new workspace',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
              data: workspaceSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.createWorkspace(request as AuthenticatedRequest, reply)
  );

  // List user's workspaces
  fastify.get(
    '/workspaces',
    {
      preHandler: [validateQuery(paginationQuerySchema)],
      schema: {
        tags: ['Workspace'],
        description: 'Get all workspaces for the authenticated user',
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
                    items: workspaceSchema,
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
      controller.getUserWorkspaces(request as AuthenticatedRequest, reply)
  );
}

/**
 * Workspace-scoped routes (with workspace authorization at route-level preHandler)
 * - GET /workspaces/:workspaceId
 * - PATCH /workspaces/:workspaceId
 * - DELETE /workspaces/:workspaceId
 */
export async function registerWorkspaceScopedRoutes(
  fastify: FastifyInstance,
  controller: WorkspaceController,
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

  // Get workspace by ID
  fastify.get(
    '/workspaces/:workspaceId',
    {
      preHandler: [
        validateParams(workspaceParamsSchema),
        workspaceAuth,
        requireRole(['owner', 'admin', 'manager', 'member']),
      ],
      schema: {
        tags: ['Workspace'],
        description: 'Get workspace by ID',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
              data: workspaceSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getWorkspace(request as AuthenticatedRequest, reply)
  );

  // Update workspace
  fastify.patch(
    '/workspaces/:workspaceId',
    {
      preHandler: [
        validateParams(workspaceParamsSchema),
        validateBody(updateWorkspaceSchema),
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Workspace'],
        description: 'Update workspace',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.updateWorkspace(request as AuthenticatedRequest, reply)
  );

  // Delete workspace
  fastify.delete(
    '/workspaces/:workspaceId',
    {
      preHandler: [
        validateParams(workspaceParamsSchema),
        workspaceAuth,
        requireRole(['owner']),
      ],
      schema: {
        tags: ['Workspace'],
        description: 'Delete workspace',
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            description: 'Workspace deleted successfully',
            type: 'null',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteWorkspace(request as AuthenticatedRequest, reply)
  );
}
