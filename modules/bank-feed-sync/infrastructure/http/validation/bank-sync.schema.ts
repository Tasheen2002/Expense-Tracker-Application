import { z } from 'zod';

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

// ==================== API RESPONSE SCHEMAS (JSON Schema) ====================

export const bankConnectionResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    institutionId: { type: 'string' },
    institutionName: { type: 'string' },
    accountId: { type: 'string' },
    accountName: { type: 'string' },
    accountType: { type: 'string' },
    accountMask: { type: 'string', nullable: true },
    currency: { type: 'string' },
    status: { type: 'string' },
    lastSyncAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
    },
    tokenExpiresAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
    },
    errorMessage: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const paginatedConnectionsResponseSchema = {
  type: 'object',
  properties: {
    connections: {
      type: 'array',
      items: bankConnectionResponseSchema,
    },
    total: { type: 'number' },
    limit: { type: 'number' },
    offset: { type: 'number' },
    hasMore: { type: 'boolean' },
  },
};

export const bankTransactionResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    connectionId: { type: 'string', format: 'uuid' },
    sessionId: { type: 'string', format: 'uuid' },
    externalId: { type: 'string' },
    amount: { type: 'number' },
    currency: { type: 'string' },
    description: { type: 'string' },
    merchantName: { type: 'string', nullable: true },
    categoryName: { type: 'string', nullable: true },
    transactionDate: { type: 'string', format: 'date-time' },
    postedDate: { type: 'string', format: 'date-time', nullable: true },
    status: { type: 'string' },
    expenseId: { type: 'string', format: 'uuid', nullable: true },
    metadata: { type: 'object', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const paginatedTransactionsResponseSchema = {
  type: 'object',
  properties: {
    transactions: {
      type: 'array',
      items: bankTransactionResponseSchema,
    },
    total: { type: 'number' },
    limit: { type: 'number' },
    offset: { type: 'number' },
    hasMore: { type: 'boolean' },
  },
};

export const syncSessionResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    connectionId: { type: 'string', format: 'uuid' },
    status: { type: 'string' },
    startedAt: { type: 'string', format: 'date-time' },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
    errorMessage: { type: 'string', nullable: true },
    transactionsSynced: { type: 'number' },
    metadata: { type: 'object', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const syncAcceptedResponseSchema = {
  type: 'object',
  properties: {
    sessionId: { type: 'string', format: 'uuid' },
  },
};

export const paginatedSyncSessionsResponseSchema = {
  type: 'object',
  properties: {
    sessions: {
      type: 'array',
      items: syncSessionResponseSchema,
    },
    total: { type: 'number' },
    limit: { type: 'number' },
    offset: { type: 'number' },
    hasMore: { type: 'boolean' },
  },
};

