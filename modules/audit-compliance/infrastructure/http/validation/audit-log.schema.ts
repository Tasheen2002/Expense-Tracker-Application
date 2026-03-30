import { z } from "zod";

// Query parameters for listing audit logs
export const listAuditLogsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0)),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

// Path parameters for getting a specific audit log
export const getAuditLogParamsSchema = z.object({
  auditLogId: z.string().uuid(),
});

export type GetAuditLogParams = z.infer<typeof getAuditLogParamsSchema>;

// Query parameters for entity audit history
export const entityAuditHistoryQuerySchema = z.object({
  entityType: z.string().min(1, "Entity type is required"),
  entityId: z.string().min(1, "Entity ID is required"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0)),
});

export type EntityAuditHistoryQuery = z.infer<
  typeof entityAuditHistoryQuerySchema
>;

// Query parameters for audit summary
export const auditSummaryQuerySchema = z.object({
  startDate: z
    .string()
    .datetime()
    .transform((val) => new Date(val)),
  endDate: z
    .string()
    .datetime()
    .transform((val) => new Date(val)),
});

export type AuditSummaryQuery = z.infer<typeof auditSummaryQuerySchema>;

// Body schema for creating an audit log (for internal/system use)
export const createAuditLogBodySchema = z.object({
  action: z.string().min(1, "Action is required"),
  entityType: z.string().min(1, "Entity type is required"),
  entityId: z.string().min(1, "Entity ID is required"),
  details: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateAuditLogBody = z.infer<typeof createAuditLogBodySchema>;

// Response schemas for documentation purposes
export const auditLogResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string(),
  userId: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  details: z.record(z.unknown()).nullable(),
  metadata: z.record(z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
});

export const paginatedAuditLogsResponseSchema = z.object({
  items: z.array(auditLogResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const auditSummaryResponseSchema = z.object({
  totalLogs: z.number(),
  actionBreakdown: z.array(
    z.object({
      action: z.string(),
      count: z.number(),
    }),
  ),
  period: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }),
});
