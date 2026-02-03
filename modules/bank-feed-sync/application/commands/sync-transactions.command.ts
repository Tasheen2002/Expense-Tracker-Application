import { SyncSession } from "../../domain/entities/sync-session.entity";
import { TransactionSyncService } from "../services/transaction-sync.service";

export interface SyncTransactionsCommand {
  workspaceId: string;
  connectionId: string;
  fromDate?: Date;
  toDate?: Date;
}

export class SyncTransactionsHandler {
  constructor(
    private readonly transactionSyncService: TransactionSyncService,
  ) {}

  async handle(command: SyncTransactionsCommand): Promise<SyncSession> {
    return await this.transactionSyncService.syncTransactions(command);
  }
}
