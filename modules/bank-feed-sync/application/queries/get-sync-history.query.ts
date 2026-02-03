import { SyncSession } from "../../domain/entities/sync-session.entity";
import { TransactionSyncService } from "../services/transaction-sync.service";

export interface GetSyncHistoryQuery {
  workspaceId: string;
  connectionId: string;
}

export class GetSyncHistoryHandler {
  constructor(
    private readonly transactionSyncService: TransactionSyncService,
  ) {}

  async handle(query: GetSyncHistoryQuery): Promise<SyncSession[]> {
    return await this.transactionSyncService.getSyncHistory(query);
  }
}
