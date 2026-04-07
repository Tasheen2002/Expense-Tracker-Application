import { CategoryRuleService } from '../services/category-rule.service';
import { WorkspaceId } from '../../../identity-workspace';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { CategoryRuleDTO } from '../../domain/entities/category-rule.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetActiveRulesByWorkspaceQuery extends IQuery {
  workspaceId: string;
  userId: string;
  limit?: number;
  offset?: number;
}

export class GetActiveRulesByWorkspaceHandler implements IQueryHandler<
  GetActiveRulesByWorkspaceQuery,
  QueryResult<PaginatedResult<CategoryRuleDTO>>
> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(
    query: GetActiveRulesByWorkspaceQuery
  ): Promise<QueryResult<PaginatedResult<CategoryRuleDTO>>> {
    const result = await this.ruleService.getActiveRulesByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      query.userId,
      { limit: query.limit, offset: query.offset }
    );

    return QueryResult.success(result);
  }
}
