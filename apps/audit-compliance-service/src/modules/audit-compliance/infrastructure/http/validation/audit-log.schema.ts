import { z } from 'zod';
import { toJsonSchema } from './validator';

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
  action: z.string().trim().min(1).max(100).optional(),
  entityType: z.string().trim().min(1).max(100).optional(),
  entityId: z.string().uuid().optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(2147483647).default(0),
}).refine((value) => !value.startDate || !value.endDate ||
  new Date(value.startDate) <= new Date(value.endDate), {
  message: 'startDate must be before or equal to endDate', path: ['endDate'],
});

export const entityHistoryQuerySchema = z.object({
  entityType: z.string().trim().min(1, 'entityType is required').max(100),
  entityId: z.string().uuid('entityId must be a UUID'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(2147483647).default(0),
});

export const auditSummaryQuerySchema = z.object({
  startDate: z.string().datetime({ offset: true }),
  endDate: z.string().datetime({ offset: true }),
}).refine((value) => new Date(value.startDate) <= new Date(value.endDate), {
  message: 'startDate must be before or equal to endDate', path: ['endDate'],
});

export const createAuditLogSchema = z.object({
  action: z.string().trim().min(1, 'action is required').max(100),
  entityType: z.string().trim().min(1, 'entityType is required').max(100),
  entityId: z.string().uuid('entityId must be a UUID'),
  details: z.record(z.unknown()).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const purgeAuditLogsQuerySchema = z.object({
  olderThanDays: z.coerce
    .number()
    .int()
    .min(30, 'Minimum retention period is 30 days')
    .max(36500),
});

export const auditLogResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  details: z.record(z.unknown()).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const createAuditLogResponseSchema = z.object({
  auditLogId: z.string().uuid(),
});

export const auditSummaryResponseSchema = z.object({
  totalLogs: z.number().int(),
  actionBreakdown: z.array(
    z.object({
      action: z.string(),
      count: z.number().int(),
    })
  ),
  period: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
});

export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;
export type AuditLogParams = z.infer<typeof auditLogParamsSchema>;
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type EntityHistoryQuery = z.infer<typeof entityHistoryQuerySchema>;
export type AuditSummaryQuery = z.infer<typeof auditSummaryQuerySchema>;
export type CreateAuditLogBody = z.infer<typeof createAuditLogSchema>;
export type PurgeAuditLogsQuery = z.infer<typeof purgeAuditLogsQuerySchema>;

// Pre-computed JSON schemas
export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const auditLogParamsJsonSchema = toJsonSchema(auditLogParamsSchema);
export const listAuditLogsQueryJsonSchema = toJsonSchema(listAuditLogsQuerySchema);
export const entityHistoryQueryJsonSchema = toJsonSchema(entityHistoryQuerySchema);
export const auditSummaryQueryJsonSchema = toJsonSchema(auditSummaryQuerySchema);
export const createAuditLogBodyJsonSchema = toJsonSchema(createAuditLogSchema);
export const purgeAuditLogsQueryJsonSchema = toJsonSchema(purgeAuditLogsQuerySchema);

// Response envelopes
export const auditLogEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: auditLogResponseSchema,
  })
);

export const createAuditLogEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: createAuditLogResponseSchema,
  })
);

export const auditLogListEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.object({
      items: z.array(auditLogResponseSchema),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
      hasMore: z.boolean(),
    }),
  })
);

export const entityAuditHistoryEnvelopeJsonSchema = auditLogListEnvelopeJsonSchema;

export const auditSummaryEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: auditSummaryResponseSchema,
  })
);
