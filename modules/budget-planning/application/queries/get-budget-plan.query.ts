import { BudgetPlanRepository } from '../../domain/repositories/budget-plan.repository';
import { BudgetPlan, BudgetPlanDTO } from '../../domain/entities/budget-plan.entity';
import { PlanId } from '../../domain/value-objects/plan-id';
import { BudgetPlanNotFoundError } from '../../domain/errors/budget-planning.errors';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetBudgetPlanQuery extends IQuery {
  id: string;
  userId: string;
}

export class GetBudgetPlanHandler implements IQueryHandler<
  GetBudgetPlanQuery,
  QueryResult<BudgetPlanDTO>
> {
  constructor(private readonly budgetPlanRepository: BudgetPlanRepository) {}

  async handle(query: GetBudgetPlanQuery): Promise<QueryResult<BudgetPlanDTO>> {
    const plan = await this.budgetPlanRepository.findById(
      PlanId.fromString(query.id)
    );
    if (!plan) {
      throw new BudgetPlanNotFoundError(query.id);
    }
    return QueryResult.success(BudgetPlan.toDTO(plan));
  }
}
