import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { PaymentMethod } from '../../domain/enums/payment-method';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';
import { ICategoryRepository } from '../../domain/repositories/category.repository';
import { CategoryId } from '../../domain/value-objects/category-id';
import { CategoryNotFoundError } from '../../domain/errors/expense.errors';
import { OperationService } from '../services/operation.service';
import { WorkspaceMembershipContext } from '../ports/workspace-authorization.port';

export interface UpdateExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly title?: string;
  readonly description?: string | null;
  readonly amount?: number;
  readonly currency?: string;
  readonly expenseDate?: Date | string;
  readonly categoryId?: string | null;
  readonly merchant?: string | null;
  readonly paymentMethod?: PaymentMethod;
  readonly isReimbursable?: boolean;
  readonly authToken?: string;
  readonly verifiedMembership?: WorkspaceMembershipContext;
}

export class UpdateExpenseHandler implements ICommandHandler<
  UpdateExpenseCommand,
  CommandResult<ExpenseDTO>
> {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly categoryRepository: ICategoryRepository,
    private readonly operationService: OperationService
  ) {
    if (!expenseService) {
      throw new Error('ExpenseService is required for UpdateExpenseHandler');
    }
    if (!categoryRepository) {
      throw new Error('CategoryRepository is required for UpdateExpenseHandler');
    }
    if (!operationService) {
      throw new Error('OperationService is required for UpdateExpenseHandler');
    }
  }

  async handle(command: UpdateExpenseCommand): Promise<CommandResult<ExpenseDTO>> {
    await this.operationService.authorize({
      actorId: command.userId,
      workspaceId: command.workspaceId,
      authToken: command.authToken,
      verifiedMembership: command.verifiedMembership,
    });

    if (command.categoryId) {
      const categoryExists = await this.categoryRepository.exists(
        CategoryId.fromString(command.categoryId),
        command.workspaceId
      );
      if (!categoryExists) {
        throw new CategoryNotFoundError(
          command.categoryId,
          command.workspaceId
        );
      }
    }

    const dto = await this.expenseService.updateExpense(
      command.expenseId,
      command.workspaceId,
      command.userId,
      {
        title: command.title,
        description: command.description,
        amount: command.amount,
        currency: command.currency,
        expenseDate: command.expenseDate,
        categoryId: command.categoryId,
        merchant: command.merchant,
        paymentMethod: command.paymentMethod,
        isReimbursable: command.isReimbursable,
      }
    );
    return CommandResult.success(dto);
  }
}
