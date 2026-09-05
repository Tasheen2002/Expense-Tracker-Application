import { BudgetPlanService } from '../services/budget-plan.service';
import { BudgetPlanDTO } from '../../domain/entities/budget-plan.entity';
import { BudgetPlanNotFoundError } from '../../domain/errors/budget-planning.errors';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetBudgetPlanQuery extends IQuery {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class GetBudgetPlanHandler implements IQueryHandler<
  GetBudgetPlanQuery,
  BudgetPlanDTO
> {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(query: GetBudgetPlanQuery): Promise<BudgetPlanDTO> {
    const dto = await this.budgetPlanService.getPlanById(query.id, query.workspaceId);
    if (!dto) {
      throw new BudgetPlanNotFoundError(query.id);
    }
    return dto;
  }
}
