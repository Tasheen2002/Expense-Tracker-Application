import { BudgetService } from '../services/budget.service';
import { BudgetDTO } from '../../domain/entities/budget.entity';
import { BudgetNotFoundError } from '../../domain/errors/budget.errors';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetBudgetQuery extends IQuery {
  readonly budgetId: string;
  readonly workspaceId: string;
}

export class GetBudgetHandler implements IQueryHandler<
  GetBudgetQuery,
  BudgetDTO
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(query: GetBudgetQuery): Promise<BudgetDTO> {
    const dto = await this.budgetService.getBudgetById(
      query.budgetId,
      query.workspaceId
    );
    if (!dto) {
      throw new BudgetNotFoundError(query.budgetId, query.workspaceId);
    }
    return dto;
  }
}
