import { FastifyInstance } from 'fastify';
import {
  AuditLogController,
  WorkspaceAuthenticatedRequest,
} from '../controllers/audit-log.controller';
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
  createAuditLogBodySchema,
  purgeLogsQuerySchema,
} from '../validation/audit.schema';

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

  // GET /summary — must be before /:auditLogId to avoid route conflict
  fastify.get(
    '/workspaces/:workspaceId/audit-logs/summary',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(auditSummaryQuerySchema),
      ],
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
              data: {
                type: 'object',
                properties: {
                  totalLogs: { type: 'number' },
                  actionBreakdown: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        action: { type: 'string' },
                        count: { type: 'number' },
                      },
                    },
                  },
                  period: {
                    type: 'object',
                    properties: {
                      startDate: { type: 'string', format: 'date-time' },
                      endDate: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.getAuditSummary(request as any, reply)
  );

  // GET /entity-history — must be before /:auditLogId
  fastify.get(
    '/workspaces/:workspaceId/audit-logs/entity-history',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(entityHistoryQuerySchema),
      ],
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
              data: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        workspaceId: { type: 'string', format: 'uuid' },
                        userId: {
                          type: 'string',
                          format: 'uuid',
                          nullable: true,
                        },
                        action: { type: 'string' },
                        entityType: { type: 'string' },
                        entityId: { type: 'string' },
                        details: {
                          type: 'object',
                          nullable: true,
                          additionalProperties: true,
                        },
                        metadata: {
                          type: 'object',
                          nullable: true,
                          additionalProperties: true,
                        },
                        ipAddress: { type: 'string', nullable: true },
                        userAgent: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                      limit: { type: 'number' },
                      offset: { type: 'number' },
                      hasMore: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.getEntityAuditHistory(request as any, reply)
  );

  // GET /
  fastify.get(
    '/workspaces/:workspaceId/audit-logs',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(listAuditLogsQuerySchema),
      ],
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
              data: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        workspaceId: { type: 'string', format: 'uuid' },
                        userId: {
                          type: 'string',
                          format: 'uuid',
                          nullable: true,
                        },
                        action: { type: 'string' },
                        entityType: { type: 'string' },
                        entityId: { type: 'string' },
                        details: {
                          type: 'object',
                          nullable: true,
                          additionalProperties: true,
                        },
                        metadata: {
                          type: 'object',
                          nullable: true,
                          additionalProperties: true,
                        },
                        ipAddress: { type: 'string', nullable: true },
                        userAgent: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                      limit: { type: 'number' },
                      offset: { type: 'number' },
                      hasMore: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.listAuditLogs(request as any, reply)
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
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  workspaceId: { type: 'string', format: 'uuid' },
                  userId: { type: 'string', format: 'uuid', nullable: true },
                  action: { type: 'string' },
                  entityType: { type: 'string' },
                  entityId: { type: 'string' },
                  details: {
                    type: 'object',
                    nullable: true,
                    additionalProperties: true,
                  },
                  metadata: {
                    type: 'object',
                    nullable: true,
                    additionalProperties: true,
                  },
                  ipAddress: { type: 'string', nullable: true },
                  userAgent: { type: 'string', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.getAuditLog(request as any, reply)
  );

  // POST / — admin only
  fastify.post(
    '/workspaces/:workspaceId/audit-logs',
    {
      preHandler: RolePermissions.ADMIN_LEVEL,
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateBody(createAuditLogBodySchema),
      ],
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
              data: {
                type: 'object',
                properties: {
                  auditLogId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.createAuditLog(request as any, reply)
  );

  // DELETE / — admin only — purge old audit logs
  fastify.delete(
    '/workspaces/:workspaceId/audit-logs',
    {
      preHandler: RolePermissions.ADMIN_LEVEL,
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(purgeLogsQuerySchema),
      ],
      schema: {
        tags: ['Audit'],
        description:
          'Purge audit logs older than a specified number of days (admin only, minimum 30 days)',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  deletedCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.purgeAuditLogs(request as any, reply)
  );
}
