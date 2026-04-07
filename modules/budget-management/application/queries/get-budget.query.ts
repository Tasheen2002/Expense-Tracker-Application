import { BudgetService } from '../services/budget.service';
import { BudgetDTO } from '../../domain/entities/budget.entity';
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
  constructor(private readonly budgetService: BudgetService) {}

  async handle(query: GetBudgetQuery): Promise<QueryResult<BudgetDTO>> {
    const dto = await this.budgetService.getBudgetById(
      query.budgetId,
      query.workspaceId
    );
    if (!dto) {
      throw new BudgetNotFoundError(query.budgetId, query.workspaceId);
    }
    return QueryResult.success(dto);
  }
}
