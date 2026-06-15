import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ViolationController } from '../controllers/violation.controller';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  acknowledgeViolationSchema,
  resolveViolationSchema,
  overrideViolationSchema,
  exemptViolationSchema,
  violationParamsSchema,
  violationQuerySchema,
  violationStatsQuerySchema,
  violationParamsJsonSchema,
  violationQueryJsonSchema,
  violationStatsQueryJsonSchema,
  acknowledgeViolationBodyJsonSchema,
  resolveViolationBodyJsonSchema,
  overrideViolationBodyJsonSchema,
  exemptViolationBodyJsonSchema,
  violationEnvelopeJsonSchema,
  violationListEnvelopeJsonSchema,
  violationStatsEnvelopeJsonSchema,
} from '../validation/violation.schema';
import {
  workspaceParamsSchema,
  workspaceParamsJsonSchema,
} from '../validation/policy.schema';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';

export async function violationRoutes(
  fastify: FastifyInstance,
  controller: ViolationController,
  prisma: PrismaClient
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, prisma);
  };

  // List violations
  fastify.get(
    '/workspaces/:workspaceId/violations',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(violationQuerySchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Policy Controls'],
        description: 'List policy violations in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: violationQueryJsonSchema,
        response: {
          200: violationListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listViolations(request as AuthenticatedRequest, reply)
  );

  // Get violation stats
  fastify.get(
    '/workspaces/:workspaceId/violations/stats',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(violationStatsQuerySchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Policy Controls'],
        description: 'Get violation statistics for workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: violationStatsQueryJsonSchema,
        response: {
          200: violationStatsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getViolationStats(request as AuthenticatedRequest, reply)
  );

  // Get violation
  fastify.get(
    '/workspaces/:workspaceId/violations/:violationId',
    {
      preValidation: [validateParams(violationParamsSchema)],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Policy Controls'],
        description: 'Get policy violation by ID',
        security: [{ bearerAuth: [] }],
        params: violationParamsJsonSchema,
        response: {
          200: violationEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getViolation(request as AuthenticatedRequest, reply)
  );

  // Acknowledge violation
  fastify.post(
    '/workspaces/:workspaceId/violations/:violationId/acknowledge',
    {
      preValidation: [validateParams(violationParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(acknowledgeViolationSchema),
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Acknowledge a policy violation',
        security: [{ bearerAuth: [] }],
        params: violationParamsJsonSchema,
        body: acknowledgeViolationBodyJsonSchema,
        response: {
          200: violationEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.acknowledgeViolation(request as AuthenticatedRequest, reply)
  );

  // Resolve violation
  fastify.post(
    '/workspaces/:workspaceId/violations/:violationId/resolve',
    {
      preValidation: [validateParams(violationParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(resolveViolationSchema),
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Resolve a policy violation',
        security: [{ bearerAuth: [] }],
        params: violationParamsJsonSchema,
        body: resolveViolationBodyJsonSchema,
        response: {
          200: violationEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.resolveViolation(request as AuthenticatedRequest, reply)
  );

  // Exempt violation
  fastify.post(
    '/workspaces/:workspaceId/violations/:violationId/exempt',
    {
      preValidation: [validateParams(violationParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(exemptViolationSchema),
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Exempt a violation using an exemption',
        security: [{ bearerAuth: [] }],
        params: violationParamsJsonSchema,
        body: exemptViolationBodyJsonSchema,
        response: {
          200: violationEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.exemptViolation(request as AuthenticatedRequest, reply)
  );

  // Override violation
  fastify.post(
    '/workspaces/:workspaceId/violations/:violationId/override',
    {
      preValidation: [validateParams(violationParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(overrideViolationSchema),
      ],
      schema: {
        tags: ['Policy Controls'],
        description: 'Override a policy violation',
        security: [{ bearerAuth: [] }],
        params: violationParamsJsonSchema,
        body: overrideViolationBodyJsonSchema,
        response: {
          200: violationEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.overrideViolation(request as AuthenticatedRequest, reply)
  );
}
