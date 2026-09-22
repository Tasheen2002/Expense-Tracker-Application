import { FastifyInstance } from 'fastify';
import { ExemptionController } from '../controllers/exemption.controller';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
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
  expireExemptionsEnvelopeJsonSchema,
} from '../validation/exemption.schema';
import {
  workspaceParamsJsonSchema,
} from '../validation/policy.schema';

export async function exemptionRoutes(
  fastify: FastifyInstance,
  controller: ExemptionController
): Promise<void> {
  // Request exemption
  fastify.post(
    '/workspaces/:workspaceId/exemptions',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(requestExemptionSchema),
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

  // Expire exemptions (Production Trigger / Scheduled Worker / Admin)
  fastify.post(
    '/workspaces/:workspaceId/exemptions/expire',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Policy Controls'],
        description: 'Process and expire eligible policy exemptions',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        response: {
          200: expireExemptionsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.expireExemptions(request as AuthenticatedRequest, reply)
  );
}
