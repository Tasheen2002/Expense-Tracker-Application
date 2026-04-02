import { FastifyInstance } from 'fastify';
import { AuditLogController } from '../controllers/audit-log.controller';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '../../../../../apps/api/src/shared/middleware/rate-limiter.middleware';
import { RolePermissions } from '../../../../../apps/api/src/shared/middleware/role-authorization.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  workspaceParamsSchema,
  auditLogParamsSchema,
  auditSummaryQuerySchema,
  entityHistoryQuerySchema,
  listAuditLogsQuerySchema,
  createAuditLogSchema,
  purgeAuditLogsQuerySchema,
  auditLogResponseSchema,
  auditSummaryResponseSchema,
  paginatedAuditLogsResponseSchema,
} from '../validation/audit-log.schema';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});


export async function auditLogRoutes(
  fastify: FastifyInstance,
  controller: AuditLogController
): Promise<void> {
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(auditSummaryQuerySchema),
      ],
      preHandler: [],
      schema: {
        tags: ['Audit'],
        description: 'Get audit summary statistics for a workspace',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: auditSummaryResponseSchema,
            },
          },
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(entityHistoryQuerySchema),
      ],
      preHandler: [],
      schema: {
        tags: ['Audit'],
        description: 'Get audit history for a specific entity',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: paginatedAuditLogsResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getEntityAuditHistory(
        request as AuthenticatedRequest,
        reply
      )
  );

  // GET / (List)
  fastify.get(
    '/workspaces/:workspaceId/audit-logs',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(listAuditLogsQuerySchema),
      ],
      preHandler: [],
      schema: {
        tags: ['Audit'],
        description: 'List audit logs with optional filters',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: paginatedAuditLogsResponseSchema,
            },
          },
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
      preValidation: [validateParams(auditLogParamsSchema)],
      schema: {
        tags: ['Audit'],
        description: 'Get a specific audit log by ID',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: auditLogResponseSchema,
            },
          },
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateBody(createAuditLogSchema),
      ],
      preHandler: [RolePermissions.ADMIN_LEVEL],
      schema: {
        tags: ['Audit'],
        description: 'Create an audit log entry (admin only)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['action', 'entityType', 'entityId'],
          properties: {
            action: { type: 'string', minLength: 1 },
            entityType: { type: 'string', minLength: 1 },
            entityId: { type: 'string', minLength: 1 },
            details: { type: 'object', nullable: true },
            metadata: { type: 'object', nullable: true },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: auditLogResponseSchema,
            },
          },
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(purgeAuditLogsQuerySchema),
      ],
      preHandler: [RolePermissions.ADMIN_LEVEL],
      schema: {
        tags: ['Audit'],
        description:
          'Purge audit logs older than a specified number of days (admin only, minimum 30 days)',
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
      controller.purgeAuditLogs(request as AuthenticatedRequest, reply)
  );
}
