import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuditLogController } from '../controllers/audit-log.controller';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  auditSummaryQuerySchema,
  entityHistoryQuerySchema,
  listAuditLogsQuerySchema,
  createAuditLogSchema,
  purgeAuditLogsQuerySchema,
  workspaceParamsJsonSchema,
  auditLogParamsJsonSchema,
  listAuditLogsQueryJsonSchema,
  entityHistoryQueryJsonSchema,
  auditSummaryQueryJsonSchema,
  createAuditLogBodyJsonSchema,
  purgeAuditLogsQueryJsonSchema,
  auditLogEnvelopeJsonSchema,
  createAuditLogEnvelopeJsonSchema,
  auditLogListEnvelopeJsonSchema,
  entityAuditHistoryEnvelopeJsonSchema,
  auditSummaryEnvelopeJsonSchema,
} from '../validation/audit-log.schema';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function auditLogRoutes(
  fastify: FastifyInstance,
  controller: AuditLogController
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, request.server.prisma);
  };

  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // GET /summary
  fastify.get(
    '/workspaces/:workspaceId/audit-logs/summary',
    {
      onRequest: [fastify.authenticate],
      preHandler: [validateQuery(auditSummaryQuerySchema), workspaceAuth],
      schema: {
        tags: ['Audit'],
        description: 'Get audit summary statistics for a workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: auditSummaryQueryJsonSchema,
        response: {
          200: auditSummaryEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getAuditSummary(request as AuthenticatedRequest, reply)
  );

  // GET /entity-history
  fastify.get(
    '/workspaces/:workspaceId/audit-logs/entity-history',
    {
      onRequest: [fastify.authenticate],
      preHandler: [validateQuery(entityHistoryQuerySchema), workspaceAuth],
      schema: {
        tags: ['Audit'],
        description: 'Get audit history for a specific entity',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: entityHistoryQueryJsonSchema,
        response: {
          200: entityAuditHistoryEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getEntityAuditHistory(request as AuthenticatedRequest, reply)
  );

  // GET / (List)
  fastify.get(
    '/workspaces/:workspaceId/audit-logs',
    {
      onRequest: [fastify.authenticate],
      preHandler: [validateQuery(listAuditLogsQuerySchema), workspaceAuth],
      schema: {
        tags: ['Audit'],
        description: 'List audit logs with optional filters',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listAuditLogsQueryJsonSchema,
        response: {
          200: auditLogListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listAuditLogs(request as AuthenticatedRequest, reply)
  );

  // GET /:auditLogId
  fastify.get(
    '/workspaces/:workspaceId/audit-logs/:auditLogId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Audit'],
        description: 'Get a specific audit log by ID',
        security: [{ bearerAuth: [] }],
        params: auditLogParamsJsonSchema,
        response: {
          200: auditLogEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getAuditLog(request as AuthenticatedRequest, reply)
  );

  // POST /
  fastify.post(
    '/workspaces/:workspaceId/audit-logs',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createAuditLogSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Audit'],
        description: 'Create an audit log entry (admin only)',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createAuditLogBodyJsonSchema,
        response: {
          201: createAuditLogEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.createAuditLog(request as AuthenticatedRequest, reply)
  );

  // DELETE / (Purge)
  fastify.delete(
    '/workspaces/:workspaceId/audit-logs',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(purgeAuditLogsQuerySchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Audit'],
        description:
          'Purge audit logs older than a specified number of days (admin only, minimum 30 days)',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: purgeAuditLogsQueryJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'No Content',
          },
        },
      },
    },
    (request, reply) =>
      controller.purgeAuditLogs(request as AuthenticatedRequest, reply)
  );
}
