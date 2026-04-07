import { FastifyInstance } from 'fastify';
import { ApprovalChainController } from '../controllers/approval-chain.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  validateBody,
  validateQuery,
  validateParams,
} from '../validation/validator';
import {
  createChainSchema,
  updateChainSchema,
  listChainsSchema,
  chainParamsSchema,
  workspaceParamsSchema,
  chainResponseSchema,
  paginatedChainsResponseSchema,
} from '../validation/approval.schema';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function approvalChainRoutes(
  fastify: FastifyInstance,
  controller: ApprovalChainController
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });
  // Create approval chain
  fastify.post(
    '/workspaces/:workspaceId/approval-chains',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [validateBody(createChainSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Create a new approval chain',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'requiresReceipt', 'approverSequence'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', nullable: true },
            minAmount: { type: 'number', minimum: 0, nullable: true },
            maxAmount: { type: 'number', minimum: 0, nullable: true },
            categoryIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              nullable: true,
            },
            requiresReceipt: { type: 'boolean' },
            approverSequence: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              minItems: 1,
            },
          },
        },
        response: {
          201: {
            description: 'Approval chain created successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: chainResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.createChain(request as AuthenticatedRequest, reply)
  );

  // List approval chains
  fastify.get(
    '/workspaces/:workspaceId/approval-chains',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [validateQuery(listChainsSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'List all approval chains in workspace',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Approval chains retrieved successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              data: paginatedChainsResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.listChains(request as AuthenticatedRequest, reply)
  );

  // Get approval chain
  fastify.get(
    '/workspaces/:workspaceId/approval-chains/:chainId',
    {
      preValidation: [validateParams(chainParamsSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Get approval chain by ID',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Approval chain retrieved successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              data: chainResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getChain(request as AuthenticatedRequest, reply)
  );

  // Update approval chain
  fastify.patch(
    '/workspaces/:workspaceId/approval-chains/:chainId',
    {
      preValidation: [validateParams(chainParamsSchema)],
      preHandler: [validateBody(updateChainSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Update approval chain',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              nullable: true,
            },
            description: { type: 'string', nullable: true },
            minAmount: { type: 'number', minimum: 0, nullable: true },
            maxAmount: { type: 'number', minimum: 0, nullable: true },
            categoryIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              nullable: true,
            },
            requiresReceipt: { type: 'boolean', nullable: true },
            approverSequence: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              minItems: 1,
              nullable: true,
            },
          },
        },
        response: {
          200: {
            description: 'Approval chain updated successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: chainResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.updateChain(request as AuthenticatedRequest, reply)
  );

  // Activate approval chain
  fastify.post(
    '/workspaces/:workspaceId/approval-chains/:chainId/activate',
    {
      preValidation: [validateParams(chainParamsSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Activate approval chain',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Approval chain activated successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: chainResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.activateChain(request as AuthenticatedRequest, reply)
  );

  // Deactivate approval chain
  fastify.post(
    '/workspaces/:workspaceId/approval-chains/:chainId/deactivate',
    {
      preValidation: [validateParams(chainParamsSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Deactivate approval chain',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Approval chain deactivated successfully',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: chainResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.deactivateChain(request as AuthenticatedRequest, reply)
  );

  // Delete approval chain
  fastify.delete(
    '/workspaces/:workspaceId/approval-chains/:chainId',
    {
      preValidation: [validateParams(chainParamsSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Delete approval chain',
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            type: 'null',
            description: 'No Content',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteChain(request as AuthenticatedRequest, reply)
  );
}
