import { BankTransaction } from "../../domain/entities/bank-transaction.entity";
import { BankTransactionService } from "../services/bank-transaction.service";

export interface ProcessTransactionCommand {
  workspaceId: string;
  transactionId: string;
  action: "import" | "match" | "ignore";
  expenseId?: string;
}

export class ProcessTransactionHandler {
  constructor(
    private readonly bankTransactionService: BankTransactionService,
  ) {}

  async handle(command: ProcessTransactionCommand): Promise<BankTransaction> {
    return await this.bankTransactionService.processTransaction(command);
  }
}
