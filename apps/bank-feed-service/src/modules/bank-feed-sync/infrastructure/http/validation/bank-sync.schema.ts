import { z } from 'zod';
import { toJsonSchema } from './validator';


/**
 * Common parameters
 */
export const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

export const connectionParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  connectionId: z.string().uuid('Invalid connection ID'),
});

export const sessionParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  sessionId: z.string().uuid('Invalid session ID'),
});

export const transactionParamsSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  transactionId: z.string().uuid('Invalid transaction ID'),
});

/**
 * Pagination query parameters
 */
export const paginationQuerySchema = z.object({
  limit: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(1).max(100).default(50)
  ),
  offset: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(0).default(0)
  ),
});

/**
 * Bank Connection schemas
 */
export const connectBankBodySchema = z.object({
  institutionId: z.string().min(1, 'Institution ID is required'),
  institutionName: z.string().min(1, 'Institution name is required'),
  accountId: z.string().min(1, 'Account ID is required'),
  accountName: z.string().min(1, 'Account name is required'),
  accountType: z.string().min(1, 'Account type is required'),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  accessToken: z.string().min(1, 'Access token is required'),
  accountMask: z.string().optional(),
  tokenExpiresAt: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date().optional()
  ),
});

export const updateConnectionTokenBodySchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  tokenExpiresAt: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date().optional()
  ),
});

/**
 * Transaction Sync schemas
 */
export const syncTransactionsBodySchema = z.object({
  fromDate: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date().optional()
  ),
  toDate: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date().optional()
  ),
  startDate: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date().optional()
  ),
  endDate: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date().optional()
  ),
  forceSync: z.preprocess(
    (val) => (typeof val === 'string' ? val === 'true' : val),
    z.boolean().optional().default(false)
  ),
});

export const syncHistoryQuerySchema = paginationQuerySchema.extend({});

/**
 * Bank Transaction schemas
 */
export const processTransactionBodySchema = z.object({
  action: z.enum(['import', 'match', 'ignore'], {
    errorMap: () => ({ message: 'Action must be: import, match, or ignore' }),
  }),
  expenseId: z.string().uuid('Invalid expense ID').optional(),
});

export const pendingTransactionsQuerySchema = paginationQuerySchema.extend({
  connectionId: z.string().uuid('Invalid connection ID').optional(),
});

/**
 * Inferred types for controllers and handlers
 */
export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;
export type ConnectionParams = z.infer<typeof connectionParamsSchema>;
export type SessionParams = z.infer<typeof sessionParamsSchema>;
export type TransactionParams = z.infer<typeof transactionParamsSchema>;

export type ConnectBankBody = z.infer<typeof connectBankBodySchema>;
export type UpdateConnectionTokenBody = z.infer<
  typeof updateConnectionTokenBodySchema
>;
export type SyncTransactionsBody = z.infer<typeof syncTransactionsBodySchema>;
export type ProcessTransactionBody = z.infer<
  typeof processTransactionBodySchema
>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PendingTransactionsQuery = z.infer<
  typeof pendingTransactionsQuerySchema
>;
export type SyncHistoryQuery = z.infer<typeof syncHistoryQuerySchema>;

// Aliases for compatibility with older code during transition
export type CreateBankConnectionInput = ConnectBankBody;
export type UpdateConnectionTokenInput = UpdateConnectionTokenBody;
export type SyncTransactionsInput = SyncTransactionsBody;
export type ProcessTransactionInput = ProcessTransactionBody;

// ==================== API RESPONSE SCHEMAS (ZOD) ====================

export const bankConnectionResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  institutionId: z.string(),
  institutionName: z.string(),
  accountId: z.string(),
  accountName: z.string(),
  accountType: z.string(),
  accountMask: z.string().nullable().optional(),
  currency: z.string(),
  status: z.string(),
  lastSyncAt: z.union([z.date(), z.string()]).nullable().optional(),
  tokenExpiresAt: z.union([z.date(), z.string()]).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});

export const paginatedConnectionsResponseSchema = z.object({
  connections: z.array(bankConnectionResponseSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  hasMore: z.boolean(),
});

export const bankTransactionResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  connectionId: z.string().uuid(),
  sessionId: z.string().uuid(),
  externalId: z.string(),
  amount: z.number(),
  currency: z.string(),
  description: z.string(),
  merchantName: z.string().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  transactionDate: z.union([z.date(), z.string()]),
  postedDate: z.union([z.date(), z.string()]).nullable().optional(),
  status: z.string(),
  expenseId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});

export const paginatedTransactionsResponseSchema = z.object({
  transactions: z.array(bankTransactionResponseSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  hasMore: z.boolean(),
});

export const syncSessionResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  connectionId: z.string().uuid(),
  status: z.string(),
  startedAt: z.union([z.date(), z.string()]),
  completedAt: z.union([z.date(), z.string()]).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  transactionsFetched: z.number().int(),
  transactionsImported: z.number().int(),
  transactionsDuplicate: z.number().int(),
});

export const syncAcceptedResponseSchema = z.object({
  sessionId: z.string().uuid(),
});

export const paginatedSyncSessionsResponseSchema = z.object({
  sessions: z.array(syncSessionResponseSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  hasMore: z.boolean(),
});

// ==================== PRE-COMPUTED JSON SCHEMAS ====================

export const workspaceParamsJsonSchema = toJsonSchema(workspaceParamsSchema);
export const connectionParamsJsonSchema = toJsonSchema(connectionParamsSchema);
export const sessionParamsJsonSchema = toJsonSchema(sessionParamsSchema);
export const transactionParamsJsonSchema = toJsonSchema(transactionParamsSchema);

export const connectBankBodyJsonSchema = toJsonSchema(connectBankBodySchema);
export const updateConnectionTokenBodyJsonSchema = toJsonSchema(updateConnectionTokenBodySchema);
export const syncTransactionsBodyJsonSchema = toJsonSchema(syncTransactionsBodySchema);
export const processTransactionBodyJsonSchema = toJsonSchema(processTransactionBodySchema);

export const paginationQueryJsonSchema = toJsonSchema(paginationQuerySchema);
export const pendingTransactionsQueryJsonSchema = toJsonSchema(pendingTransactionsQuerySchema);
export const syncHistoryQueryJsonSchema = toJsonSchema(syncHistoryQuerySchema);

// ==================== RESPONSE ENVELOPES ====================

export const bankConnectionEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: bankConnectionResponseSchema.optional(),
  })
);

export const paginatedConnectionsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: paginatedConnectionsResponseSchema,
  })
);

export const bankTransactionEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: bankTransactionResponseSchema,
  })
);

export const paginatedTransactionsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: paginatedTransactionsResponseSchema,
  })
);

export const syncSessionEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: syncSessionResponseSchema,
  })
);

export const paginatedSyncSessionsEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: paginatedSyncSessionsResponseSchema,
  })
);

export const syncAcceptedEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: syncAcceptedResponseSchema,
  })
);

export const processTransactionEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
    data: z.null().optional(),
  })
);

export const baseResponseEnvelopeJsonSchema = toJsonSchema(
  z.object({
    success: z.boolean(),
    statusCode: z.number(),
    message: z.string(),
  })
);


