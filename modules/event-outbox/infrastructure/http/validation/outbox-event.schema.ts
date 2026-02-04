import { z } from "zod";

/**
 * Store Outbox Event Schema
 */
export const storeOutboxEventSchema = z.object({
  aggregateType: z.string().min(1, "Aggregate type is required"),
  aggregateId: z.string().uuid("Invalid aggregate ID format"),
  eventType: z.string().min(1, "Event type is required"),
  payload: z.record(z.any()),
});

export type StoreOutboxEventInput = z.infer<typeof storeOutboxEventSchema>;

/**
 * Get Pending Events Query Schema
 */
export const pendingEventsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
});

export type PendingEventsQuery = z.infer<typeof pendingEventsQuerySchema>;

/**
 * Get Failed Events Query Schema
 */
export const failedEventsQuerySchema = z.object({
  maxRetries: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 3)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
});

export type FailedEventsQuery = z.infer<typeof failedEventsQuerySchema>;

/**
 * Event ID Param Schema
 */
export const eventIdParamSchema = z.object({
  eventId: z.string().uuid("Invalid event ID format"),
});

export type EventIdParam = z.infer<typeof eventIdParamSchema>;
