import { FastifyInstance } from 'fastify'
import { SpendingLimitController } from '../controllers/spending-limit.controller'

export async function spendingLimitRoutes(
  fastify: FastifyInstance,
  controller: SpendingLimitController
) {
  // Create spending limit
  fastify.post(
    '/:workspaceId/spending-limits',
    {
      schema: {
        tags: ['Spending Limit'],
        description: 'Create a new spending limit',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['limitAmount', 'currency', 'periodType'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            categoryId: { type: 'string', format: 'uuid' },
            limitAmount: { type: 'number', minimum: 0.01 },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            periodType: { type: 'string', enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'] },
          },
        },
      },
    },
    (request, reply) => controller.createLimit(request as any, reply)
  )

  // List spending limits
  fastify.get(
    '/:workspaceId/spending-limits',
    {
      schema: {
        tags: ['Spending Limit'],
        description: 'List all spending limits in workspace',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            categoryId: { type: 'string', format: 'uuid' },
            isActive: { type: 'string', enum: ['true', 'false'] },
            periodType: { type: 'string', enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'] },
          },
        },
      },
    },
    (request, reply) => controller.listLimits(request as any, reply)
  )

  // Update spending limit
  fastify.put(
    '/:workspaceId/spending-limits/:limitId',
    {
      schema: {
        tags: ['Spending Limit'],
        description: 'Update spending limit',
        params: {
          type: 'object',
          required: ['workspaceId', 'limitId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            limitId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            limitAmount: { type: 'number', minimum: 0.01 },
          },
        },
      },
    },
    (request, reply) => controller.updateLimit(request as any, reply)
  )

  // Delete spending limit
  fastify.delete(
    '/:workspaceId/spending-limits/:limitId',
    {
      schema: {
        tags: ['Spending Limit'],
        description: 'Delete spending limit',
        params: {
          type: 'object',
          required: ['workspaceId', 'limitId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            limitId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.deleteLimit(request as any, reply)
  )
}
