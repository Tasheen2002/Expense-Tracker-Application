import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { BankConnectionId } from "../../domain/value-objects/bank-connection-id";
import { BankTransactionId } from "../../domain/value-objects/bank-transaction-id";
import { BankTransaction } from "../../domain/entities/bank-transaction.entity";
import { IBankTransactionRepository } from "../../domain/repositories/bank-transaction.repository";
import { TransactionStatus } from "../../domain/enums/transaction-status.enum";
import {
  BankTransactionNotFoundError,
  MissingExpenseIdError,
  InvalidTransactionActionError,
} from "../../domain/errors";
import { ProcessTransactionCommand } from "../commands";
import { GetPendingTransactionsQuery } from "../queries";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class BankTransactionService {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository,
  ) {}

  async processTransaction(
    command: ProcessTransactionCommand,
  ): Promise<BankTransaction> {
    const workspaceId = WorkspaceId.fromString(command.workspaceId);
    const transactionId = BankTransactionId.fromString(command.transactionId);

    const transaction = await this.transactionRepository.findById(
      transactionId,
      workspaceId,
    );

    if (!transaction) {
      throw new BankTransactionNotFoundError(command.transactionId);
    }

    switch (command.action) {
      case "import":
        if (!command.expenseId) {
          throw new MissingExpenseIdError("import");
        }
        transaction.markAsImported(command.expenseId);
        break;

      case "match":
        if (!command.expenseId) {
          throw new MissingExpenseIdError("match");
        }
        transaction.markAsMatched(command.expenseId);
        break;

      case "ignore":
        transaction.markAsIgnored();
        break;

      default:
        throw new InvalidTransactionActionError(command.action);
    }

    await this.transactionRepository.save(transaction);
    return transaction;
  }

  async getPendingTransactions(
    query: GetPendingTransactionsQuery & { options?: PaginationOptions },
  ): Promise<PaginatedResult<BankTransaction>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);

    if (query.connectionId) {
      const connectionId = BankConnectionId.fromString(query.connectionId);
      return this.transactionRepository.findByConnectionAndStatus(
        workspaceId,
        connectionId,
        TransactionStatus.PENDING,
        query.options,
      );
    }

    return this.transactionRepository.findByStatus(
      workspaceId,
      TransactionStatus.PENDING,
      query.options,
    );
  }

  async getTransaction(
    workspaceId: string,
    transactionId: string,
  ): Promise<BankTransaction> {
    const wsId = WorkspaceId.fromString(workspaceId);
    const txnId = BankTransactionId.fromString(transactionId);

    const transaction = await this.transactionRepository.findById(txnId, wsId);

    if (!transaction) {
      throw new BankTransactionNotFoundError(transactionId);
    }

    return transaction;
  }

  async getTransactionsByConnection(
    workspaceId: string,
    connectionId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BankTransaction>> {
    const wsId = WorkspaceId.fromString(workspaceId);
    const connId = BankConnectionId.fromString(connectionId);

    return this.transactionRepository.findByConnection(wsId, connId, options);
  }
}
