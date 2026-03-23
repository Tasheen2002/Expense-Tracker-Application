import { WorkspaceId } from '../../../identity-workspace';
import { BankTransactionId } from '../../domain/value-objects/bank-transaction-id';
import { IBankTransactionRepository } from '../../domain/repositories/bank-transaction.repository';
import {
  BankTransactionNotFoundError,
  MissingExpenseIdError,
  InvalidTransactionActionError,
} from '../../domain/errors';
import { ICommand, ICommandHandler, CommandResult } from '../../../../apps/api/src/shared/application';
export interface ProcessTransactionCommand extends ICommand {
  workspaceId: string;
  transactionId: string;
  action: 'import' | 'match' | 'ignore';
  expenseId?: string;
}

export class ProcessTransactionHandler implements ICommandHandler<ProcessTransactionCommand, CommandResult<void>> {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository
  ) {}

  async handle(
    command: ProcessTransactionCommand
  ): Promise<CommandResult<void>> {
    try {
      
          const workspaceId = WorkspaceId.fromString(command.workspaceId);
          const transactionId = BankTransactionId.fromString(command.transactionId);
      
          const transaction = await this.transactionRepository.findById(
            transactionId,
            workspaceId
          );
      
          if (!transaction) {
            throw new BankTransactionNotFoundError(command.transactionId);
          }
      
          switch (command.action) {
            case 'import':
              if (!command.expenseId) {
                throw new MissingExpenseIdError('import');
              }
              transaction.markAsImported(command.expenseId);
              break;
      
            case 'match':
              if (!command.expenseId) {
                throw new MissingExpenseIdError('match');
              }
              transaction.markAsMatched(command.expenseId);
              break;
      
            case 'ignore':
              transaction.markAsIgnored();
              break;
      
            default:
              throw new InvalidTransactionActionError(command.action);
          }
      
          await this.transactionRepository.save(transaction);
          return CommandResult.success();
        
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
