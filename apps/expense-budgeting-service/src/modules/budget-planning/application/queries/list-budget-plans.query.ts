import { BudgetPlanService } from '../services/budget-plan.service';
import { BudgetPlanDTO } from '../../domain/entities/budget-plan.entity';
import { PlanStatus } from '../../domain/enums/plan-status.enum';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface ListBudgetPlansQuery extends IQuery {
  readonly userId: string;
  readonly workspaceId: string;
  readonly status?: PlanStatus;
  readonly limit?: number;
  readonly offset?: number;
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
