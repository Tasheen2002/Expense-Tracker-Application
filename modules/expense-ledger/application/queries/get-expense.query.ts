import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';
import { ExpenseNotFoundError } from '../../domain/errors/expense.errors';

export interface GetExpenseQuery extends IQuery {
  readonly expenseId: string;
  readonly workspaceId: string;
}

export class GetExpenseHandler implements IQueryHandler<GetExpenseQuery, ExpenseDTO> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(query: GetExpenseQuery): Promise<ExpenseDTO> {
    const expense = await this.expenseService.getExpenseById(
      query.expenseId,
      query.workspaceId
    );

    if (!expense) {
      throw new ExpenseNotFoundError(query.expenseId, query.workspaceId);
    }

    return expense;
  }
}
