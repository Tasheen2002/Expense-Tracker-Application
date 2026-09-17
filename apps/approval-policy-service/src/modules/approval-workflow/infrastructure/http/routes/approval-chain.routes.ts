import { FastifyInstance } from 'fastify';
import { ApprovalChainController } from '../controllers/approval-chain.controller';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  createChainSchema,
  updateChainSchema,
  listChainsSchema,
  CreateChainBody,
  UpdateChainBody,
  ListChainsQuery,
  WorkspaceParams,
  ChainParams,
  workspaceParamsJsonSchema,
  chainParamsJsonSchema,
  createChainBodyJsonSchema,
  updateChainBodyJsonSchema,
  listChainsQueryJsonSchema,
  chainEnvelopeJsonSchema,
  updateChainEnvelopeJsonSchema,
  paginatedChainsEnvelopeJsonSchema,
} from '../validation/approval.schema';
import {
  createRateLimiter,
  RateLimitPresets,
  userOrIpKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userOrIpKeyGenerator,
});

export async function approvalChainRoutes(
  fastify: FastifyInstance,
  controller: ApprovalChainController
) {
  // Create approval chain
  fastify.post<{ Params: WorkspaceParams; Body: CreateChainBody }>(
    '/workspaces/:workspaceId/approval-chains',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        writeRateLimiter,
        validateBody(createChainSchema),
      ],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Create a new approval chain',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createChainBodyJsonSchema,
        response: {
          201: chainEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.createChain(request, reply)
  );

  // List approval chains
  fastify.get<{ Params: WorkspaceParams; Querystring: ListChainsQuery }>(
    '/workspaces/:workspaceId/approval-chains',
    {
      onRequest: [fastify.authenticate],
      preHandler: [validateQuery(listChainsSchema)],
      schema: {
        tags: ['Approval Workflow'],
        description: 'List all approval chains in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listChainsQueryJsonSchema,
        response: {
          200: paginatedChainsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.listChains(request, reply)
  );

  // Get approval chain
  fastify.get<{ Params: ChainParams }>(
    '/workspaces/:workspaceId/approval-chains/:chainId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Get approval chain by ID',
        security: [{ bearerAuth: [] }],
        params: chainParamsJsonSchema,
        response: {
          200: chainEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.getChain(request, reply)
  );

  // Update approval chain
  fastify.patch<{ Params: ChainParams; Body: UpdateChainBody }>(
    '/workspaces/:workspaceId/approval-chains/:chainId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        writeRateLimiter,
        validateBody(updateChainSchema),
      ],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Update approval chain',
        security: [{ bearerAuth: [] }],
        params: chainParamsJsonSchema,
        body: updateChainBodyJsonSchema,
        response: {
          200: updateChainEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.updateChain(request, reply)
  );

  // Activate approval chain
  fastify.post<{ Params: ChainParams }>(
    '/workspaces/:workspaceId/approval-chains/:chainId/activate',
    {
      onRequest: [fastify.authenticate],
      preHandler: [writeRateLimiter],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Activate approval chain',
        security: [{ bearerAuth: [] }],
        params: chainParamsJsonSchema,
        response: {
          200: chainEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.activateChain(request, reply)
  );

  // Deactivate approval chain
  fastify.post<{ Params: ChainParams }>(
    '/workspaces/:workspaceId/approval-chains/:chainId/deactivate',
    {
      onRequest: [fastify.authenticate],
      preHandler: [writeRateLimiter],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Deactivate approval chain',
        security: [{ bearerAuth: [] }],
        params: chainParamsJsonSchema,
        response: {
          200: chainEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.deactivateChain(request, reply)
  );

  // Delete approval chain
  fastify.delete<{ Params: ChainParams }>(
    '/workspaces/:workspaceId/approval-chains/:chainId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [writeRateLimiter],
      schema: {
        tags: ['Approval Workflow'],
        description: 'Delete approval chain',
        security: [{ bearerAuth: [] }],
        params: chainParamsJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'No Content',
          },
        },
      },
    },
    (request, reply) => controller.deleteChain(request, reply)
  );
}
