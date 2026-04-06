import { IBudgetPlanRepository } from '../../domain/repositories/budget-plan.repository';
import { BudgetPlan, BudgetPlanDTO } from '../../domain/entities/budget-plan.entity';
import { WorkspaceId } from '../../../identity-workspace';
import { PlanStatus } from '../../domain/enums/plan-status.enum';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
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
  QueryResult<PaginatedResult<BudgetPlanDTO>>
> {
  constructor(private readonly budgetPlanRepository: IBudgetPlanRepository) {}

  async handle(
    query: ListBudgetPlansQuery
  ): Promise<QueryResult<PaginatedResult<BudgetPlanDTO>>> {
    const result = await this.budgetPlanRepository.findAll(
      WorkspaceId.fromString(query.workspaceId),
      query.status,
      {
        limit: query.limit,
        offset: query.offset,
      }
    );
    return QueryResult.success({
      items: result.items.map((plan) => BudgetPlan.toDTO(plan)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }
}
