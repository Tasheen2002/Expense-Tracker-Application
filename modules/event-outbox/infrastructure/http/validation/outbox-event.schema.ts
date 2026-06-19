import { z } from 'zod';
import { toJsonSchema } from './validator';

// ==================== PARAM SCHEMAS ====================

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
});

export const eventParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  eventId: z.string().uuid('Invalid event ID format'),
});

// ==================== REQUEST SCHEMAS ====================

export const storeOutboxEventSchema = z.object({
  aggregateType: z.string().min(1, 'Aggregate type is required'),
  aggregateId: z.string().uuid('Invalid aggregate ID format'),
  eventType: z.string().min(1, 'Event type is required'),
  payload: z.record(z.unknown()),
});

export const pendingEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const failedEventsQuerySchema = z.object({
  maxRetries: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const cleanupEventsQuerySchema = z.object({
  retentionDays: z.coerce.number().int().min(1).optional(),
});

// ==================== RESPONSE SCHEMAS ====================

export const outboxEventResponseSchema = z.object({
  id: z.string().uuid(),
  aggregateType: z.string(),
  aggregateId: z.string().uuid(),
  eventType: z.string(),
  payload: z.record(z.unknown()),
  status: z.string(),
  createdAt: z.string(),
  processedAt: z.string().nullable(),
  retryCount: z.number(),
  error: z.string().nullable(),
});

export const paginatedOutboxEventResponseSchema = z.object({
  items: z.array(outboxEventResponseSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export const retryAllResponseSchema = z.object({
  retried: z.number(),
  deadLettered: z.number(),
});

export const deadLetterCountResponseSchema = z.object({
  count: z.number(),
});

// ==================== INFERRED INPUT TYPES ====================

export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;
export type EventParams = z.infer<typeof eventParamsSchema>;
export type StoreOutboxEventBody = z.infer<typeof storeOutboxEventSchema>;
export type PendingEventsQuerystring = z.infer<typeof pendingEventsQuerySchema>;
export type FailedEventsQuerystring = z.infer<typeof failedEventsQuerySchema>;
export type CleanupEventsQuerystring = z.infer<typeof cleanupEventsQuerySchema>;

// ==================== PRE-COMPUTED JSON SCHEMAS ====================

export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const eventParamsJsonSchema = toJsonSchema(eventParamsSchema);
export const storeOutboxEventBodyJsonSchema = toJsonSchema(storeOutboxEventSchema);
export const pendingEventsQueryJsonSchema = toJsonSchema(pendingEventsQuerySchema);
export const failedEventsQueryJsonSchema = toJsonSchema(failedEventsQuerySchema);
export const cleanupEventsQueryJsonSchema = toJsonSchema(cleanupEventsQuerySchema);

// ==================== ENVELOPE JSON SCHEMAS ====================

export const outboxEventEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: outboxEventResponseSchema,
  })
);

export const paginatedOutboxEventEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: paginatedOutboxEventResponseSchema,
  })
);

export const retryAllEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: retryAllResponseSchema,
  })
);

export const deadLetterCountEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: deadLetterCountResponseSchema,
  })
);

export const baseResponseEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
  })
);
