import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PolicyController } from '../controllers/policy.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  createPolicySchema,
  updatePolicySchema,
  policyQuerySchema,
  createPolicyBodyJsonSchema,
  updatePolicyBodyJsonSchema,
  workspaceParamsJsonSchema,
  policyParamsJsonSchema,
  policyQueryJsonSchema,
  policyEnvelopeJsonSchema,
  createPolicyEnvelopeJsonSchema,
  policyListEnvelopeJsonSchema,
  policyActionSuccessResponseJsonSchema,
} from '../validation/policy.schema';

export async function policyRoutes(
  fastify: FastifyInstance,
  controller: PolicyController
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(
      request as AuthenticatedRequest,
      reply,
      request.server.prisma
    );
  };

  // Create policy
  fastify.post(
    '/workspaces/:workspaceId/policies',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createPolicySchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Create a new expense policy',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createPolicyBodyJsonSchema,
        response: {
          201: createPolicyEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.createPolicy(request as AuthenticatedRequest, reply)
  );

  // List policies
  fastify.get(
    '/workspaces/:workspaceId/policies',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(policyQuerySchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'List all expense policies in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: policyQueryJsonSchema,
        response: {
          200: policyListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listPolicies(request as AuthenticatedRequest, reply)
  );

  // Get policy
  fastify.get(
    '/workspaces/:workspaceId/policies/:policyId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Policy Controls'],
        description: 'Get expense policy by ID',
        security: [{ bearerAuth: [] }],
        params: policyParamsJsonSchema,
        response: {
          200: policyEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getPolicy(request as AuthenticatedRequest, reply)
  );

  // Update policy
  fastify.put(
    '/workspaces/:workspaceId/policies/:policyId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updatePolicySchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Update expense policy',
        security: [{ bearerAuth: [] }],
        params: policyParamsJsonSchema,
        body: updatePolicyBodyJsonSchema,
        response: {
          200: policyEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updatePolicy(request as AuthenticatedRequest, reply)
  );

  // Delete policy
  fastify.delete(
    '/workspaces/:workspaceId/policies/:policyId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Delete expense policy',
        security: [{ bearerAuth: [] }],
        params: policyParamsJsonSchema,
        response: {
          200: policyActionSuccessResponseJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.deletePolicy(request as AuthenticatedRequest, reply)
  );

  // Activate policy
  fastify.post(
    '/workspaces/:workspaceId/policies/:policyId/activate',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Activate expense policy',
        security: [{ bearerAuth: [] }],
        params: policyParamsJsonSchema,
        response: {
          200: policyEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.activatePolicy(request as AuthenticatedRequest, reply)
  );

  // Deactivate policy
  fastify.post(
    '/workspaces/:workspaceId/policies/:policyId/deactivate',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Deactivate expense policy',
        security: [{ bearerAuth: [] }],
        params: policyParamsJsonSchema,
        response: {
          200: policyEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.deactivatePolicy(request as AuthenticatedRequest, reply)
  );
}
