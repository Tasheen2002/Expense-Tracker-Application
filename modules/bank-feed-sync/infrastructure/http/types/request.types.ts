import { FastifyRequest } from "fastify";
import {
  CreateBankConnectionInput,
  UpdateConnectionTokenInput,
  ConnectionIdParam,
} from "../validation/bank-connection.schema";
import {
  SyncTransactionsInput,
  SyncSessionIdParam,
  SyncHistoryQuery,
} from "../validation/transaction-sync.schema";
import {
  ProcessTransactionInput,
  TransactionIdParam,
  PendingTransactionsQuery,
} from "../validation/bank-transaction.schema";

/**
 * Base types for authentication and workspace context
 */
export interface AuthenticatedUser {
  userId: string;
  workspaceId?: string;
}

export interface WorkspaceParams {
  workspaceId: string;
}

/**
 * Bank Connection Request Types
 */
export interface CreateBankConnectionRequest extends FastifyRequest {
  params: WorkspaceParams;
  body: CreateBankConnectionInput;
  user: AuthenticatedUser;
}

export interface GetConnectionsRequest extends FastifyRequest {
  params: WorkspaceParams;
}

export interface GetConnectionRequest extends FastifyRequest {
  params: WorkspaceParams & ConnectionIdParam;
}

export interface UpdateConnectionTokenRequest extends FastifyRequest {
  params: WorkspaceParams & ConnectionIdParam;
  body: UpdateConnectionTokenInput;
}

export interface DisconnectBankRequest extends FastifyRequest {
  params: WorkspaceParams & ConnectionIdParam;
}

export interface DeleteConnectionRequest extends FastifyRequest {
  params: WorkspaceParams & ConnectionIdParam;
}

/**
 * Transaction Sync Request Types
 */
export interface SyncTransactionsRequest extends FastifyRequest {
  params: WorkspaceParams & ConnectionIdParam;
  body: SyncTransactionsInput;
}

export interface GetSyncHistoryRequest extends FastifyRequest {
  params: WorkspaceParams & ConnectionIdParam;
  querystring: SyncHistoryQuery;
}

export interface GetSyncSessionRequest extends FastifyRequest {
  params: WorkspaceParams & SyncSessionIdParam;
}

export interface GetActiveSyncsRequest extends FastifyRequest {
  params: WorkspaceParams;
}

/**
 * Bank Transaction Request Types
 */
export interface GetPendingTransactionsRequest extends FastifyRequest {
  params: WorkspaceParams;
  querystring: PendingTransactionsQuery;
}

export interface GetTransactionRequest extends FastifyRequest {
  params: WorkspaceParams & TransactionIdParam;
}

export interface ProcessTransactionRequest extends FastifyRequest {
  params: WorkspaceParams & TransactionIdParam;
  body: ProcessTransactionInput;
}

export interface GetTransactionsByConnectionRequest extends FastifyRequest {
  params: WorkspaceParams & ConnectionIdParam;
}
