import { BudgetPlanService } from '../services/budget-plan.service';
import { BudgetPlan } from '../../domain/entities/budget-plan.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { PlanStatus } from '../../domain/enums/plan-status.enum';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface ListBudgetPlansQuery extends IQuery {
  userId: string;
  workspaceId: string;
  status?: PlanStatus;
  limit?: number;
  offset?: number;
}

export class ListBudgetPlansHandler implements IQueryHandler<
  ListBudgetPlansQuery,
  QueryResult<PaginatedResult<BudgetPlan>>
> {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(
    query: ListBudgetPlansQuery
  ): Promise<QueryResult<PaginatedResult<BudgetPlan>>> {
    const result = await this.budgetPlanService.listPlans(
      query.userId,
      query.workspaceId,
      query.status,
      {
        limit: query.limit,
        offset: query.offset,
      }
    );
    return QueryResult.success(result);
  }
}
