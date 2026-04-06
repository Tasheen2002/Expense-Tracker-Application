import { CategoryRuleService } from '../services/category-rule.service';
import { WorkspaceId } from '../../../identity-workspace';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { CategoryRule, CategoryRuleDTO } from '../../domain/entities/category-rule.entity';
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

    return QueryResult.success({
      items: result.items.map(CategoryRule.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }
}
