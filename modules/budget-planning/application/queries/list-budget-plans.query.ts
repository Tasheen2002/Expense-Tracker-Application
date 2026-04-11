import { BudgetPlanService } from '../services/budget-plan.service';
import { BudgetPlanDTO } from '../../domain/entities/budget-plan.entity';
import { PlanStatus } from '../../domain/enums/plan-status.enum';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface ListBudgetPlansQuery extends IQuery {
  userId: string;
  workspaceId: string;
  status?: PlanStatus;
  limit?: number;
  offset?: number;
}

export class ListBudgetPlansHandler implements IQueryHandler<
  ListBudgetPlansQuery,
  PaginatedResult<BudgetPlanDTO>
> {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(query: ListBudgetPlansQuery): Promise<PaginatedResult<BudgetPlanDTO>> {
    return this.budgetPlanService.getPlans(
      query.workspaceId,
      query.status,
      { limit: query.limit, offset: query.offset },
    );
  }
}
