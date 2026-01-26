import { FastifyInstance } from 'fastify'
import { TagController } from '../controllers/tag.controller'

export async function tagRoutes(fastify: FastifyInstance, controller: TagController) {
  // Create tag
  fastify.post(
    '/:workspaceId/tags',
    {
      schema: {
        tags: ['Tag'],
        description: 'Create a new tag',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 50 },
            color: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
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
                  tagId: { type: 'string' },
                  workspaceId: { type: 'string' },
                  name: { type: 'string' },
                  color: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.createTag(request as any, reply)
  )

  // Update tag
  fastify.put(
    '/:workspaceId/tags/:tagId',
    {
      schema: {
        tags: ['Tag'],
        description: 'Update a tag',
        params: {
          type: 'object',
          required: ['workspaceId', 'tagId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            tagId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 50 },
            color: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
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
                  tagId: { type: 'string' },
                  workspaceId: { type: 'string' },
                  name: { type: 'string' },
                  color: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.updateTag(request as any, reply)
  )

  // Delete tag
  fastify.delete(
    '/:workspaceId/tags/:tagId',
    {
      schema: {
        tags: ['Tag'],
        description: 'Delete a tag',
        params: {
          type: 'object',
          required: ['workspaceId', 'tagId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            tagId: { type: 'string', format: 'uuid' },
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
    },
    (request, reply) => controller.deleteTag(request as any, reply)
  )

  // Get tag by ID
  fastify.get(
    '/:workspaceId/tags/:tagId',
    {
      schema: {
        tags: ['Tag'],
        description: 'Get tag by ID',
        params: {
          type: 'object',
          required: ['workspaceId', 'tagId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            tagId: { type: 'string', format: 'uuid' },
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
                  tagId: { type: 'string' },
                  workspaceId: { type: 'string' },
                  name: { type: 'string' },
                  color: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.getTag(request as any, reply)
  )

  // List tags
  fastify.get(
    '/:workspaceId/tags',
    {
      schema: {
        tags: ['Tag'],
        description: 'List all tags',
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
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    tagId: { type: 'string' },
                    workspaceId: { type: 'string' },
                    name: { type: 'string' },
                    color: { type: 'string' },
                    createdAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.listTags(request as any, reply)
  )
}
