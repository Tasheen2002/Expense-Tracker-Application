import { IBudgetRepository } from '../../domain/repositories/budget.repository';
import { Budget, BudgetDTO } from '../../domain/entities/budget.entity';
import { BudgetId } from '../../domain/value-objects/budget-id';
import { BudgetNotFoundError } from '../../domain/errors/budget.errors';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetBudgetQuery extends IQuery {
  budgetId: string;
  workspaceId: string;
}

export class GetBudgetHandler implements IQueryHandler<
  GetBudgetQuery,
  QueryResult<BudgetDTO>
> {
  constructor(private readonly budgetRepository: IBudgetRepository) {}

  async handle(query: GetBudgetQuery): Promise<QueryResult<BudgetDTO>> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(query.budgetId),
      query.workspaceId
    );
    if (!budget) {
      throw new BudgetNotFoundError(query.budgetId, query.workspaceId);
    }
    return QueryResult.success(Budget.toDTO(budget));
  }
}
