import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ViolationController } from '../controllers/violation.controller';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  acknowledgeViolationSchema,
  resolveViolationSchema,
  overrideViolationSchema,
  exemptViolationSchema,
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
  violationQuerySchema,
  violationStatsQuerySchema,
} from '../validation/violation.schema';
import {
  workspaceParamsJsonSchema,
} from '../validation/policy.schema';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';

export async function violationRoutes(
  fastify: FastifyInstance,
  controller: ViolationController
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(
      request as AuthenticatedRequest,
      reply,
      request.server.prisma
    );
  };

  // List violations
  fastify.get(
    '/workspaces/:workspaceId/violations',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(violationQuerySchema),
        workspaceAuth,
      ],
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(violationStatsQuerySchema),
        workspaceAuth,
      ],
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
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(acknowledgeViolationSchema),
        workspaceAuth,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(resolveViolationSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(exemptViolationSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(overrideViolationSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
