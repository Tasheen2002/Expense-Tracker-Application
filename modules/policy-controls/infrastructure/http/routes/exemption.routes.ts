import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ExemptionController } from '../controllers/exemption.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  requestExemptionSchema,
  approveExemptionSchema,
  rejectExemptionSchema,
  exemptionQuerySchema,
  checkActiveExemptionQuerySchema,
  exemptionParamsJsonSchema,
  exemptionQueryJsonSchema,
  checkActiveExemptionQueryJsonSchema,
  requestExemptionBodyJsonSchema,
  approveExemptionBodyJsonSchema,
  rejectExemptionBodyJsonSchema,
  exemptionEnvelopeJsonSchema,
  createExemptionEnvelopeJsonSchema,
  exemptionListEnvelopeJsonSchema,
  activeExemptionEnvelopeJsonSchema,
} from '../validation/exemption.schema';
import {
  workspaceParamsJsonSchema,
} from '../validation/policy.schema';

export async function exemptionRoutes(
  fastify: FastifyInstance,
  controller: ExemptionController
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(
      request as AuthenticatedRequest,
      reply,
      request.server.prisma
    );
  };

  // Request exemption
  fastify.post(
    '/workspaces/:workspaceId/exemptions',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(requestExemptionSchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Request a policy exemption',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: requestExemptionBodyJsonSchema,
        response: {
          201: createExemptionEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.requestExemption(request as AuthenticatedRequest, reply)
  );

  // List exemptions
  fastify.get(
    '/workspaces/:workspaceId/exemptions',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(exemptionQuerySchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'List policy exemptions for a workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: exemptionQueryJsonSchema,
        response: {
          200: exemptionListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listExemptions(request as AuthenticatedRequest, reply)
  );

  // Check active exemption
  fastify.get(
    '/workspaces/:workspaceId/exemptions/active',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(checkActiveExemptionQuerySchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Check if user has active exemption for a policy',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: checkActiveExemptionQueryJsonSchema,
        response: {
          200: activeExemptionEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.checkActiveExemption(request as AuthenticatedRequest, reply)
  );

  // Get exemption
  fastify.get(
    '/workspaces/:workspaceId/exemptions/:exemptionId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Policy Controls'],
        description: 'Get policy exemption by ID',
        security: [{ bearerAuth: [] }],
        params: exemptionParamsJsonSchema,
        response: {
          200: exemptionEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getExemption(request as AuthenticatedRequest, reply)
  );

  // Approve exemption
  fastify.post(
    '/workspaces/:workspaceId/exemptions/:exemptionId/approve',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(approveExemptionSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Approve a policy exemption request',
        security: [{ bearerAuth: [] }],
        params: exemptionParamsJsonSchema,
        body: approveExemptionBodyJsonSchema,
        response: {
          200: exemptionEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.approveExemption(request as AuthenticatedRequest, reply)
  );

  // Reject exemption
  fastify.post(
    '/workspaces/:workspaceId/exemptions/:exemptionId/reject',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(rejectExemptionSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Reject a policy exemption request',
        security: [{ bearerAuth: [] }],
        params: exemptionParamsJsonSchema,
        body: rejectExemptionBodyJsonSchema,
        response: {
          200: exemptionEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.rejectExemption(request as AuthenticatedRequest, reply)
  );
}
