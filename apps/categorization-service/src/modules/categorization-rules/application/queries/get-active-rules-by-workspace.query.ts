import { CategoryRuleService } from '../services/category-rule.service';
import {  WorkspaceId  } from '@core/domain/value-objects';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { CategoryRuleDTO } from '../../domain/entities/category-rule.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetActiveRulesByWorkspaceQuery extends IQuery {
  readonly workspaceId: string;
  readonly userId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetActiveRulesByWorkspaceHandler implements IQueryHandler<
  GetActiveRulesByWorkspaceQuery,
  PaginatedResult<CategoryRuleDTO>
> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(query: GetActiveRulesByWorkspaceQuery): Promise<PaginatedResult<CategoryRuleDTO>> {
    return this.ruleService.getActiveRulesByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      query.userId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
