import { z } from 'zod';

// ── Request Schemas (Zod) ─────────────────────────────────────────────────────

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
});

export const eventParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  eventId: z.string().uuid('Invalid event ID format'),
});

export const storeOutboxEventSchema = z.object({
  aggregateType: z.string().min(1, 'Aggregate type is required'),
  aggregateId: z.string().uuid('Invalid aggregate ID format'),
  eventType: z.string().min(1, 'Event type is required'),
  payload: z.record(z.unknown()),
});

export const pendingEventsQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});

export const failedEventsQuerySchema = z.object({
  maxRetries: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});

export const cleanupEventsQuerySchema = z.object({
  retentionDays: z.string().regex(/^\d+$/).optional(),
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;
export type EventParams = z.infer<typeof eventParamsSchema>;
export type StoreOutboxEventBody = z.infer<typeof storeOutboxEventSchema>;
export type PendingEventsQuerystring = z.infer<typeof pendingEventsQuerySchema>;
export type FailedEventsQuerystring = z.infer<typeof failedEventsQuerySchema>;
export type CleanupEventsQuerystring = z.infer<typeof cleanupEventsQuerySchema>;

// ── Response JSON Schemas (for Swagger) ──────────────────────────────────────

export const outboxEventResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    aggregateType: { type: 'string' },
    aggregateId: { type: 'string', format: 'uuid' },
    eventType: { type: 'string' },
    payload: { type: 'object' },
    status: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    processedAt: { type: 'string', format: 'date-time', nullable: true },
    retryCount: { type: 'integer' },
    error: { type: 'string', nullable: true },
  },
} as const;

export const paginatedOutboxEventResponseSchema = {
  type: 'object',
  properties: {
    items: { type: 'array', items: outboxEventResponseSchema },
    total: { type: 'integer' },
    limit: { type: 'integer' },
    offset: { type: 'integer' },
    hasMore: { type: 'boolean' },
  },
} as const;

export const retryAllResponseSchema = {
  type: 'object',
  properties: {
    retried: { type: 'integer' },
    deadLettered: { type: 'integer' },
  },
} as const;

export const deadLetterCountResponseSchema = {
  type: 'object',
  properties: {
    count: { type: 'integer' },
  },
} as const;

// ── Request JSON Schemas (for Fastify validation / Swagger body) ──────────────

export const storeOutboxEventBodyJson = {
  type: 'object',
  required: ['aggregateType', 'aggregateId', 'eventType', 'payload'],
  properties: {
    aggregateType: { type: 'string', minLength: 1 },
    aggregateId: { type: 'string', format: 'uuid' },
    eventType: { type: 'string', minLength: 1 },
    payload: { type: 'object' },
  },
} as const;

export const workspaceParamsJson = {
  type: 'object',
  required: ['workspaceId'],
  properties: {
    workspaceId: { type: 'string', format: 'uuid' },
  },
} as const;

export const eventParamsJson = {
  type: 'object',
  required: ['workspaceId', 'eventId'],
  properties: {
    workspaceId: { type: 'string', format: 'uuid' },
    eventId: { type: 'string', format: 'uuid' },
  },
} as const;

export const pendingEventsQueryJson = {
  type: 'object',
  properties: {
    limit: { type: 'string', pattern: '^[0-9]+$' },
    offset: { type: 'string', pattern: '^[0-9]+$' },
  },
} as const;

export const failedEventsQueryJson = {
  type: 'object',
  properties: {
    maxRetries: { type: 'string', pattern: '^[0-9]+$' },
    limit: { type: 'string', pattern: '^[0-9]+$' },
    offset: { type: 'string', pattern: '^[0-9]+$' },
  },
} as const;

export const cleanupEventsQueryJson = {
  type: 'object',
  properties: {
    retentionDays: { type: 'string', pattern: '^[0-9]+$' },
  },
} as const;

