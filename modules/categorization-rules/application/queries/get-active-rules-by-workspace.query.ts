import { CategoryRuleService } from '../services/category-rule.service';
import { WorkspaceId } from '../../../identity-workspace';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { CategoryRuleDTO } from '../../domain/entities/category-rule.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetActiveRulesByWorkspaceQuery extends IQuery {
  workspaceId: string;
  userId: string;
  limit?: number;
  offset?: number;
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
