import { z } from 'zod';

/**
 * Common parameters
 */
export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const connectionParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  connectionId: z.string().uuid(),
});

export const sessionParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export const transactionParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  transactionId: z.string().uuid(),
});

/**
 * Pagination query parameters
 */
export const paginationQuerySchema = z.object({
  limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().min(1).max(100).default(50)),
  offset: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().min(0).default(0)),
});

/**
 * Bank Connection schemas
 */
export const connectBankBodySchema = z.object({
  institutionId: z.string().min(1),
  institutionName: z.string().min(1),
  accountId: z.string().min(1),
  accountName: z.string().min(1),
  accountType: z.string().min(1),
  currency: z.string().length(3),
  accessToken: z.string().min(1),
  accountMask: z.string().optional(),
  tokenExpiresAt: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date().optional()),
});

export const updateConnectionTokenBodySchema = z.object({
  accessToken: z.string().min(1),
  tokenExpiresAt: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date().optional()),
});

/**
 * Transaction Sync schemas
 */
export const syncTransactionsBodySchema = z.object({
  fromDate: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date().optional()),
  toDate: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date().optional()),
});

/**
 * Bank Transaction schemas
 */
export const processTransactionBodySchema = z.object({
  action: z.enum(['import', 'match', 'ignore']),
  expenseId: z.string().uuid().optional(),
});

export const pendingTransactionsQuerySchema = paginationQuerySchema.extend({
  connectionId: z.string().uuid().optional(),
});

/**
 * Inferred types for controllers
 */
export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;
export type ConnectionParams = z.infer<typeof connectionParamsSchema>;
export type SessionParams = z.infer<typeof sessionParamsSchema>;
export type TransactionParams = z.infer<typeof transactionParamsSchema>;

export type ConnectBankBody = z.infer<typeof connectBankBodySchema>;
export type UpdateConnectionTokenBody = z.infer<typeof updateConnectionTokenBodySchema>;
export type SyncTransactionsBody = z.infer<typeof syncTransactionsBodySchema>;
export type ProcessTransactionBody = z.infer<typeof processTransactionBodySchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PendingTransactionsQuery = z.infer<typeof pendingTransactionsQuerySchema>;
