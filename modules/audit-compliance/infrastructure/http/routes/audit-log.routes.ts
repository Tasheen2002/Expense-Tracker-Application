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
      schema: {
        tags: ['Audit'],
        description: 'Get audit summary statistics for a workspace',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
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
                      startDate: { type: 'string' },
                      endDate: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getAuditSummary(
        request as WorkspaceAuthenticatedRequest,
        reply
      )
  );

  // GET /entity-history — must be before /:auditLogId
  fastify.get(
    '/workspaces/:workspaceId/audit-logs/entity-history',
    {
      schema: {
        tags: ['Audit'],
        description: 'Get audit history for a specific entity',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array' },
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
    (request, reply) =>
      controller.getEntityAuditHistory(
        request as WorkspaceAuthenticatedRequest,
        reply
      )
  );

  // GET /
  fastify.get(
    '/workspaces/:workspaceId/audit-logs',
    {
      schema: {
        tags: ['Audit'],
        description: 'List audit logs with optional filters',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array' },
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
    (request, reply) =>
      controller.listAuditLogs(request as WorkspaceAuthenticatedRequest, reply)
  );

  // GET /:auditLogId
  fastify.get(
    '/workspaces/:workspaceId/audit-logs/:auditLogId',
    {
      schema: {
        tags: ['Audit'],
        description: 'Get a specific audit log by ID',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  workspaceId: { type: 'string' },
                  userId: { type: 'string', nullable: true },
                  action: { type: 'string' },
                  entityType: { type: 'string' },
                  entityId: { type: 'string' },
                  details: { type: 'object', nullable: true },
                  metadata: { type: 'object', nullable: true },
                  ipAddress: { type: 'string', nullable: true },
                  userAgent: { type: 'string', nullable: true },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getAuditLog(request as WorkspaceAuthenticatedRequest, reply)
  );

  // POST / — admin only
  fastify.post(
    '/workspaces/:workspaceId/audit-logs',
    {
      preHandler: RolePermissions.ADMIN_LEVEL,
      schema: {
        tags: ['Audit'],
        description: 'Create an audit log entry (admin only)',
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                nullable: true,
                properties: {
                  auditLogId: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.createAuditLog(request as WorkspaceAuthenticatedRequest, reply)
  );

  // DELETE / — admin only — purge old audit logs
  fastify.delete(
    '/workspaces/:workspaceId/audit-logs',
    {
      preHandler: RolePermissions.ADMIN_LEVEL,
      schema: {
        tags: ['Audit'],
        description:
          'Purge audit logs older than a specified number of days (admin only, minimum 30 days)',
        querystring: {
          type: 'object',
          required: ['olderThanDays'],
          properties: {
            olderThanDays: { type: 'integer', minimum: 30 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                nullable: true,
                properties: {
                  deletedCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.purgeAuditLogs(request as WorkspaceAuthenticatedRequest, reply)
  );
}
