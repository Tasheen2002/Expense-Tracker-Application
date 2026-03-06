import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { BankTransaction } from "../entities/bank-transaction.entity";
import { BankTransactionId } from "../value-objects/bank-transaction-id";
import { BankConnectionId } from "../value-objects/bank-connection-id";
import { SyncSessionId } from "../value-objects/sync-session-id";
import { TransactionStatus } from "../enums/transaction-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface IBankTransactionRepository {
  save(transaction: BankTransaction): Promise<void>;
  saveBatch(transactions: BankTransaction[]): Promise<void>;
  findById(
    id: BankTransactionId,
    workspaceId: WorkspaceId,
  ): Promise<BankTransaction | null>;
  findByExternalId(
    workspaceId: WorkspaceId,
    externalId: string,
  ): Promise<BankTransaction | null>;
  findByExternalIds(
    workspaceId: WorkspaceId,
    externalIds: string[],
  ): Promise<Set<string>>;
  findByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BankTransaction>>;
  findBySession(
    workspaceId: WorkspaceId,
    sessionId: SyncSessionId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BankTransaction>>;
  findByStatus(
    workspaceId: WorkspaceId,
    status: TransactionStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BankTransaction>>;
  findByConnectionAndStatus(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    status: TransactionStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BankTransaction>>;
  findPotentialDuplicates(
    workspaceId: WorkspaceId,
    amount: number,
    transactionDate: Date,
    description: string,
  ): Promise<BankTransaction[]>;
}
