import { BudgetPlanService } from '../services/budget-plan.service';
import { BudgetPlanDTO } from '../../domain/entities/budget-plan.entity';
import { BudgetPlanNotFoundError } from '../../domain/errors/budget-planning.errors';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetBudgetPlanQuery extends IQuery {
  id: string;
  workspaceId: string;
  userId: string;
}

export class GetBudgetPlanHandler implements IQueryHandler<
  GetBudgetPlanQuery,
  QueryResult<BudgetPlanDTO>
> {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(query: GetBudgetPlanQuery): Promise<QueryResult<BudgetPlanDTO>> {
    const dto = await this.budgetPlanService.getPlanById(query.id, query.workspaceId);
    if (!dto) {
      throw new BudgetPlanNotFoundError(query.id);
    }
    return QueryResult.success(dto);
  }
}
