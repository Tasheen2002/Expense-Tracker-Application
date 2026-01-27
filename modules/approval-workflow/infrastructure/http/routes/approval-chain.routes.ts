import { FastifyInstance } from 'fastify'
import { ApprovalChainController } from '../controllers/approval-chain.controller'

export async function approvalChainRoutes(
  fastify: FastifyInstance,
  controller: ApprovalChainController
) {
  // Create approval chain
  fastify.post(
    '/:workspaceId/approval-chains',
    {
      schema: {
        tags: ['Approval Workflow'],
        description: 'Create a new approval chain',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['name', 'requiresReceipt', 'approverSequence'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string' },
            minAmount: { type: 'number', minimum: 0 },
            maxAmount: { type: 'number', minimum: 0 },
            categoryIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            requiresReceipt: { type: 'boolean' },
            approverSequence: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
          },
        },
      },
    },
    (request, reply) => controller.createChain(request as any, reply)
  )

  // List approval chains
  fastify.get(
    '/:workspaceId/approval-chains',
    {
      schema: {
        tags: ['Approval Workflow'],
        description: 'List all approval chains in workspace',
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
            activeOnly: { type: 'string', enum: ['true', 'false'] },
          },
        },
      },
    },
    (request, reply) => controller.listChains(request as any, reply)
  )

  // Get approval chain
  fastify.get(
    '/:workspaceId/approval-chains/:chainId',
    {
      schema: {
        tags: ['Approval Workflow'],
        description: 'Get approval chain by ID',
        params: {
          type: 'object',
          required: ['workspaceId', 'chainId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            chainId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.getChain(request as any, reply)
  )

  // Update approval chain
  fastify.patch(
    '/:workspaceId/approval-chains/:chainId',
    {
      schema: {
        tags: ['Approval Workflow'],
        description: 'Update approval chain',
        params: {
          type: 'object',
          required: ['workspaceId', 'chainId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            chainId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string' },
            minAmount: { type: 'number', minimum: 0 },
            maxAmount: { type: 'number', minimum: 0 },
            approverSequence: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
          },
        },
      },
    },
    (request, reply) => controller.updateChain(request as any, reply)
  )

  // Activate approval chain
  fastify.post(
    '/:workspaceId/approval-chains/:chainId/activate',
    {
      schema: {
        tags: ['Approval Workflow'],
        description: 'Activate approval chain',
        params: {
          type: 'object',
          required: ['workspaceId', 'chainId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            chainId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.activateChain(request as any, reply)
  )

  // Deactivate approval chain
  fastify.post(
    '/:workspaceId/approval-chains/:chainId/deactivate',
    {
      schema: {
        tags: ['Approval Workflow'],
        description: 'Deactivate approval chain',
        params: {
          type: 'object',
          required: ['workspaceId', 'chainId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            chainId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.deactivateChain(request as any, reply)
  )

  // Delete approval chain
  fastify.delete(
    '/:workspaceId/approval-chains/:chainId',
    {
      schema: {
        tags: ['Approval Workflow'],
        description: 'Delete approval chain',
        params: {
          type: 'object',
          required: ['workspaceId', 'chainId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            chainId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.deleteChain(request as any, reply)
  )
}
