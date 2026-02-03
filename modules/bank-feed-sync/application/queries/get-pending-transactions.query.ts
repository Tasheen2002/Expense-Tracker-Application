import { BankTransaction } from "../../domain/entities/bank-transaction.entity";
import { BankTransactionService } from "../services/bank-transaction.service";

export interface GetPendingTransactionsQuery {
  workspaceId: string;
  connectionId?: string;
}

export class GetPendingTransactionsHandler {
  constructor(
    private readonly bankTransactionService: BankTransactionService,
  ) {}

  async handle(query: GetPendingTransactionsQuery): Promise<BankTransaction[]> {
    return await this.bankTransactionService.getPendingTransactions(query);
  }
}
