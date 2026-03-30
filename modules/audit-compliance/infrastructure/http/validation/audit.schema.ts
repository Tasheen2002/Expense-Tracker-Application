import { z } from 'zod';

/**
 * Reusable pagination schema
 */
export const paginationSchema = z.object({
  limit: z.preprocess(
    (val) => (val === undefined ? undefined : Number(val)),
    z.number().int().min(1).max(100).default(50)
  ),
  offset: z.preprocess(
    (val) => (val === undefined ? undefined : Number(val)),
    z.number().int().min(0).default(0)
  ),
});

/**
 * Workspace params schema
 */
export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});

/**
 * Audit log params schema
 */
export const auditLogParamsSchema = workspaceParamsSchema.extend({
  auditLogId: z.string().uuid(),
});

/**
 * Audit summary query schema
 */
export const auditSummaryQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

/**
 * Entity history query schema
 */
export const entityHistoryQuerySchema = paginationSchema.extend({
  entityType: z.string().min(1),
  entityId: z.string().min(1), // Can be UUID or string depending on entity
});

/**
 * List audit logs query schema
 */
export const listAuditLogsQuerySchema = paginationSchema.extend({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
});

/**
 * Create audit log body schema
 */
export const createAuditLogBodySchema = z.object({
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  details: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Purge logs query schema
 */
export const purgeLogsQuerySchema = z.object({
  olderThanDays: z.preprocess(
    (val) => (val === undefined ? undefined : Number(val)),
    z.number().int().min(30)
  ),
});

// Inferred types
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type EntityHistoryQuery = z.infer<typeof entityHistoryQuerySchema>;
export type AuditSummaryQuery = z.infer<typeof auditSummaryQuerySchema>;
export type CreateAuditLogBody = z.infer<typeof createAuditLogBodySchema>;
export type PurgeLogsQuery = z.infer<typeof purgeLogsQuerySchema>;
export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;
export type AuditLogParams = z.infer<typeof auditLogParamsSchema>;
