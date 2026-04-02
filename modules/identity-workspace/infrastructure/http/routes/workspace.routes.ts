import { FastifyInstance } from 'fastify';
import { WorkspaceController } from '../controllers/workspace.controller.js';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface.js';
import {
  createRateLimiter,
  RateLimitPresets,
} from '../../../../../apps/api/src/shared/middleware/rate-limiter.middleware.js';
import { validateBody } from '../validation/validator';
import {
  createWorkspaceSchema as createWorkspaceZodSchema,
  updateWorkspaceSchema as updateWorkspaceZodSchema,
} from '../validation/workspace.schema';

const writeRateLimiter = createRateLimiter(RateLimitPresets.writeOperations);

const createWorkspaceSchema = {
  schema: {
    tags: ['Workspace'],
    description: 'Create a new workspace',
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
          statusCode: { type: 'number' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              workspaceId: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              ownerId: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

const getWorkspaceSchema = {
  schema: {
    tags: ['Workspace'],
    description: 'Get workspace by ID',
    params: {
      type: 'object',
      required: ['workspaceId'],
      properties: {
        workspaceId: { type: 'string', format: 'uuid' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          statusCode: { type: 'number' },
          data: {
            type: 'object',
            properties: {
              workspaceId: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              ownerId: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

const getUserWorkspacesSchema = {
  schema: {
    tags: ['Workspace'],
    description: 'Get all workspaces for the authenticated user',
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          statusCode: { type: 'number' },
          data: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    workspaceId: { type: 'string' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    ownerId: { type: 'string' },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                  hasMore: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
  },
};

const updateWorkspaceSchema = {
  schema: {
    tags: ['Workspace'],
    description: 'Update workspace',
    params: {
      type: 'object',
      required: ['workspaceId'],
      properties: {
        workspaceId: { type: 'string', format: 'uuid' },
      },
    },
    body: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          statusCode: { type: 'number' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              workspaceId: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              ownerId: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

const deleteWorkspaceSchema = {
  schema: {
    tags: ['Workspace'],
    description: 'Delete workspace',
    params: {
      type: 'object',
      required: ['workspaceId'],
      properties: {
        workspaceId: { type: 'string', format: 'uuid' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          statusCode: { type: 'number' },
          message: { type: 'string' },
        },
      },
    },
  },
};

export async function registerWorkspaceRoutes(
  fastify: FastifyInstance,
  controller: WorkspaceController
) {
  // Create workspace (requires authentication)
  fastify.post(
    '/workspaces',
    {
      ...createWorkspaceSchema,
      onRequest: [fastify.authenticate, writeRateLimiter],
      preValidation: [validateBody(createWorkspaceZodSchema)],
    },
    async (request, reply) =>
      controller.createWorkspace(request as AuthenticatedRequest, reply)
  );

  // Get user's workspaces (requires authentication)
  fastify.get(
    '/workspaces',
    {
      ...getUserWorkspacesSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) =>
      controller.getUserWorkspaces(request as AuthenticatedRequest, reply)
  );

  // Get workspace by ID (requires authentication)
  fastify.get(
    '/workspaces/:workspaceId',
    {
      ...getWorkspaceSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) =>
      controller.getWorkspace(request as AuthenticatedRequest, reply)
  );

  // Update workspace (requires authentication)
  fastify.patch(
    '/workspaces/:workspaceId',
    {
      ...updateWorkspaceSchema,
      onRequest: [fastify.authenticate, writeRateLimiter],
      preValidation: [validateBody(updateWorkspaceZodSchema)],
    },
    async (request, reply) =>
      controller.updateWorkspace(request as AuthenticatedRequest, reply)
  );

  // Delete workspace (requires authentication)
  fastify.delete(
    '/workspaces/:workspaceId',
    {
      ...deleteWorkspaceSchema,
      onRequest: [fastify.authenticate, writeRateLimiter],
    },
    async (request, reply) =>
      controller.deleteWorkspace(request as AuthenticatedRequest, reply)
  );
}
