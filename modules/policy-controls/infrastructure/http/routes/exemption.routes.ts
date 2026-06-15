import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ExemptionController } from '../controllers/exemption.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  requestExemptionSchema,
  approveExemptionSchema,
  rejectExemptionSchema,
  exemptionParamsSchema,
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
  workspaceParamsSchema,
  workspaceParamsJsonSchema,
} from '../validation/policy.schema';

export async function exemptionRoutes(
  fastify: FastifyInstance,
  controller: ExemptionController,
  prisma: PrismaClient
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, prisma);
  };

  // Request exemption
  fastify.post(
    '/workspaces/:workspaceId/exemptions',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(exemptionQuerySchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(checkActiveExemptionQuerySchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
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
      preValidation: [validateParams(exemptionParamsSchema)],
      preHandler: [fastify.authenticate, workspaceAuth],
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
      preValidation: [validateParams(exemptionParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
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
      preValidation: [validateParams(exemptionParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
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
}
