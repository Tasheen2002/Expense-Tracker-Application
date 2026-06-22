import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ApprovalChainController } from '../controllers/approval-chain.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  createChainSchema,
  updateChainSchema,
  listChainsSchema,
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
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, request.server.prisma);
  };

  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create approval chain
  fastify.post(
    '/workspaces/:workspaceId/approval-chains',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createChainSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
    (request, reply) =>
      controller.createChain(request as AuthenticatedRequest, reply)
  );

  // List approval chains
  fastify.get(
    '/workspaces/:workspaceId/approval-chains',
    {
      onRequest: [fastify.authenticate],
      preHandler: [validateQuery(listChainsSchema), workspaceAuth],
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
    (request, reply) =>
      controller.listChains(request as AuthenticatedRequest, reply)
  );

  // Get approval chain
  fastify.get(
    '/workspaces/:workspaceId/approval-chains/:chainId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
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
    (request, reply) =>
      controller.getChain(request as AuthenticatedRequest, reply)
  );

  // Update approval chain
  fastify.patch(
    '/workspaces/:workspaceId/approval-chains/:chainId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updateChainSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
    (request, reply) =>
      controller.updateChain(request as AuthenticatedRequest, reply)
  );

  // Activate approval chain
  fastify.post(
    '/workspaces/:workspaceId/approval-chains/:chainId/activate',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth, RolePermissions.ADMIN_LEVEL],
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
    (request, reply) =>
      controller.activateChain(request as AuthenticatedRequest, reply)
  );

  // Deactivate approval chain
  fastify.post(
    '/workspaces/:workspaceId/approval-chains/:chainId/deactivate',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth, RolePermissions.ADMIN_LEVEL],
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
    (request, reply) =>
      controller.deactivateChain(request as AuthenticatedRequest, reply)
  );

  // Delete approval chain
  fastify.delete(
    '/workspaces/:workspaceId/approval-chains/:chainId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth, RolePermissions.ADMIN_LEVEL],
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
    (request, reply) =>
      controller.deleteChain(request as AuthenticatedRequest, reply)
  );
}
