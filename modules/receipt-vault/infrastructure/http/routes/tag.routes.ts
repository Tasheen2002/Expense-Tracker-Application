import { FastifyInstance } from 'fastify'
import { TagController } from '../controllers/tag.controller'
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface'

export async function tagRoutes(
  fastify: FastifyInstance,
  controller: TagController
) {
  // Create receipt tag
  fastify.post(
    '/:workspaceId/receipt-tags',
    {
      schema: {
        tags: ['Receipt Tag'],
        description: 'Create a new receipt tag',
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
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            color: { type: 'string', maxLength: 7 }, // Hex color code
          },
        },
      },
    },
    (request, reply) => controller.createTag(request as AuthenticatedRequest, reply)
  )

  // Update receipt tag
  fastify.put(
    '/:workspaceId/receipt-tags/:tagId',
    {
      schema: {
        tags: ['Receipt Tag'],
        description: 'Update a receipt tag',
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
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            color: { type: 'string', maxLength: 7 },
          },
        },
      },
    },
    (request, reply) => controller.updateTag(request as AuthenticatedRequest, reply)
  )

  // Delete receipt tag
  fastify.delete(
    '/:workspaceId/receipt-tags/:tagId',
    {
      schema: {
        tags: ['Receipt Tag'],
        description: 'Delete a receipt tag',
        params: {
          type: 'object',
          required: ['workspaceId', 'tagId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            tagId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.deleteTag(request as AuthenticatedRequest, reply)
  )

  // List all receipt tags for a workspace
  fastify.get(
    '/:workspaceId/receipt-tags',
    {
      schema: {
        tags: ['Receipt Tag'],
        description: 'List all receipt tags for a workspace',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.listTags(request as AuthenticatedRequest, reply)
  )
}
