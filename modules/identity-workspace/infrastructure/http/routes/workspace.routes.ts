import { FastifyInstance } from 'fastify'
import { WorkspaceController } from '../controllers/workspace.controller'

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
}

const getWorkspaceSchema = {
  schema: {
    tags: ['Workspace'],
    description: 'Get workspace by ID',
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
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
}

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
        },
      },
    },
  },
}

const updateWorkspaceSchema = {
  schema: {
    tags: ['Workspace'],
    description: 'Update workspace',
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
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
}

const deleteWorkspaceSchema = {
  schema: {
    tags: ['Workspace'],
    description: 'Delete workspace',
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
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
}

export async function registerWorkspaceRoutes(
  fastify: FastifyInstance,
  controller: WorkspaceController
) {
  // Create workspace (requires authentication)
  fastify.post(
    '/workspaces',
    {
      ...createWorkspaceSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => controller.createWorkspace(request, reply)
  )

  // Get user's workspaces (requires authentication)
  fastify.get(
    '/workspaces',
    {
      ...getUserWorkspacesSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => controller.getUserWorkspaces(request, reply)
  )

  // Get workspace by ID (requires authentication)
  fastify.get(
    '/workspaces/:id',
    {
      ...getWorkspaceSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => controller.getWorkspace(request, reply)
  )

  // Update workspace (requires authentication)
  fastify.patch(
    '/workspaces/:id',
    {
      ...updateWorkspaceSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => controller.updateWorkspace(request, reply)
  )

  // Delete workspace (requires authentication)
  fastify.delete(
    '/workspaces/:id',
    {
      ...deleteWorkspaceSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => controller.deleteWorkspace(request, reply)
  )
}
