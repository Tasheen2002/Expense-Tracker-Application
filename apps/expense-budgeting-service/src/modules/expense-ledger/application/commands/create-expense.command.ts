import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { PaymentMethod } from '../../domain/enums/payment-method';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';
import { ICategoryRepository } from '../../domain/repositories/category.repository';
import { ITagRepository } from '../../domain/repositories/tag.repository';
import { CategoryId } from '../../domain/value-objects/category-id';
import { CategoryNotFoundError } from '../../domain/errors/expense.errors';
import { OperationService } from '../services/operation.service';
import { WorkspaceMembershipContext } from '../ports/workspace-authorization.port';

export interface CreateExpenseCommand extends ICommand {
  readonly workspaceId: string;
  readonly userId: string;
  readonly title: string;
  readonly amount: number;
  readonly currency: string;
  readonly expenseDate: Date | string;
  readonly paymentMethod: PaymentMethod;
  readonly isReimbursable: boolean;
  readonly description?: string;
  readonly categoryId?: string;
  readonly merchant?: string;
  readonly tagIds?: string[];
  readonly authToken?: string;
  readonly verifiedMembership?: WorkspaceMembershipContext;
}

export class CreateExpenseHandler implements ICommandHandler<
  CreateExpenseCommand,
  CommandResult<ExpenseDTO>
> {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly categoryRepository: ICategoryRepository,
    _tagRepository: ITagRepository | undefined,
    private readonly operationService: OperationService
  ) {
    if (!expenseService) {
      throw new Error('ExpenseService is required for CreateExpenseHandler');
    }
    if (!categoryRepository) {
      throw new Error('CategoryRepository is required for CreateExpenseHandler');
    }
    if (!operationService) {
      throw new Error('OperationService is required for CreateExpenseHandler');
    }
  }

  async handle(
    command: CreateExpenseCommand
  ): Promise<CommandResult<ExpenseDTO>> {
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

    const dto = await this.expenseService.createExpense({
      workspaceId: command.workspaceId,
      userId: command.userId,
      title: command.title,
      description: command.description,
      amount: command.amount,
      currency: command.currency,
      expenseDate: command.expenseDate,
      categoryId: command.categoryId,
      merchant: command.merchant,
      paymentMethod: command.paymentMethod,
      isReimbursable: command.isReimbursable,
      tagIds: command.tagIds,
    });
    return CommandResult.success(dto);
  }
}
