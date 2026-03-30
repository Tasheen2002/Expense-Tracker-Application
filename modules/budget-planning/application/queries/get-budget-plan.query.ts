import { BudgetPlanService } from '../services/budget-plan.service';
import { BudgetPlan } from '../../domain/entities/budget-plan.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetBudgetPlanQuery extends IQuery {
  id: string;
  userId: string;
}

export class GetBudgetPlanHandler implements IQueryHandler<
  GetBudgetPlanQuery,
  QueryResult<BudgetPlan>
> {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(query: GetBudgetPlanQuery): Promise<QueryResult<BudgetPlan>> {
    const result = await this.budgetPlanService.getPlan(query.id, query.userId);
    return QueryResult.success(result);
  }
}
