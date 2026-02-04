import { SyncSession } from "../../domain/entities/sync-session.entity";
import { TransactionSyncService } from "../services/transaction-sync.service";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface GetSyncHistoryQuery {
  workspaceId: string;
  connectionId: string;
  options?: PaginationOptions;
}

export class GetSyncHistoryHandler {
  constructor(
    private readonly transactionSyncService: TransactionSyncService,
  ) {}

  async handle(
    query: GetSyncHistoryQuery,
  ): Promise<PaginatedResult<SyncSession>> {
    return await this.transactionSyncService.getSyncHistory(query);
  }
}
