import { z } from 'zod';

/**
 * Common Parameter Schemas
 */
export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspaceId format'),
});

export const auditLogParamsSchema = workspaceParamsSchema.extend({
  auditLogId: z.string().uuid('Invalid auditLogId format'),
});

/**
 * Input Validation Schemas (Zod)
 * Used by preValidation/preHandler hooks for request validation.
 */
export const listAuditLogsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const entityHistoryQuerySchema = z.object({
  entityType: z.string().min(1, 'entityType is required'),
  entityId: z.string().min(1, 'entityId is required'),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const auditSummaryQuerySchema = z.object({
  startDate: z.string().datetime('startDate must be a valid ISO date'),
  endDate: z.string().datetime('endDate must be a valid ISO date'),
});

export const createAuditLogSchema = z.object({
  action: z.string().min(1, 'action is required'),
  entityType: z.string().min(1, 'entityType is required'),
  entityId: z.string().min(1, 'entityId is required'),
  details: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const purgeAuditLogsQuerySchema = z.object({
  olderThanDays: z.coerce
    .number()
    .min(30, 'Minimum retention period is 30 days'),
});

/**
 * Response Serialization Schemas (JSON Schema / POJO)
 * Centralized UI Response Schemas (Rule #1).
 * These are used by Fastify for serialization and Swagger documentation.
 */

export const auditLogResponseSchema = {
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
};

export const createAuditLogResponseSchema = {
  type: 'object',
  properties: {
    auditLogId: { type: 'string', format: 'uuid' },
  },
};

export const paginatedAuditLogsResponseSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: auditLogResponseSchema,
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
};

export const auditSummaryResponseSchema = {
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
};
