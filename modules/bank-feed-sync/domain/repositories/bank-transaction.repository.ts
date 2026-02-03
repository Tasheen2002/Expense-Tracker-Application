import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { BankTransaction } from "../entities/bank-transaction.entity";
import { BankTransactionId } from "../value-objects/bank-transaction-id";
import { BankConnectionId } from "../value-objects/bank-connection-id";
import { SyncSessionId } from "../value-objects/sync-session-id";
import { TransactionStatus } from "../enums/transaction-status.enum";

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
  findByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
  ): Promise<BankTransaction[]>;
  findBySession(
    workspaceId: WorkspaceId,
    sessionId: SyncSessionId,
  ): Promise<BankTransaction[]>;
  findByStatus(
    workspaceId: WorkspaceId,
    status: TransactionStatus,
  ): Promise<BankTransaction[]>;
  findPotentialDuplicates(
    workspaceId: WorkspaceId,
    amount: number,
    transactionDate: Date,
    description: string,
  ): Promise<BankTransaction[]>;
}
