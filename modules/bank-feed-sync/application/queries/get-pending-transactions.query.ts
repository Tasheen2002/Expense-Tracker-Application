import { BankTransaction } from "../../domain/entities/bank-transaction.entity";
import { BankTransactionService } from "../services/bank-transaction.service";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface GetPendingTransactionsQuery {
  workspaceId: string;
  connectionId?: string;
  options?: PaginationOptions;
}

export class GetPendingTransactionsHandler {
  constructor(
    private readonly bankTransactionService: BankTransactionService,
  ) {}

  async handle(
    query: GetPendingTransactionsQuery,
  ): Promise<PaginatedResult<BankTransaction>> {
    return await this.bankTransactionService.getPendingTransactions(query);
  }
}
