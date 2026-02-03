import { z } from "zod";
import { DEFAULT_LOOKBACK_DAYS } from "../../../domain/constants/bank-feed-sync.constants";

/**
 * Sync Transactions Schema
 */
export const syncTransactionsSchema = z.object({
  startDate: z.string().datetime("Invalid start date format").optional(),
  endDate: z.string().datetime("Invalid end date format").optional(),
  forceSync: z.boolean().optional().default(false),
});

export type SyncTransactionsInput = z.infer<typeof syncTransactionsSchema>;

/**
 * Sync Session ID Param Schema
 */
export const syncSessionIdParamSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
});

export type SyncSessionIdParam = z.infer<typeof syncSessionIdParamSchema>;

/**
 * Get Sync History Query Schema
 */
export const syncHistoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

export type SyncHistoryQuery = z.infer<typeof syncHistoryQuerySchema>;
