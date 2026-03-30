import { CategoryRuleService } from '../services/category-rule.service';
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { CategoryRule } from '../../domain/entities/category-rule.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetRulesByWorkspaceQuery extends IQuery {
  workspaceId: string;
  userId: string;
  limit?: number;
  offset?: number;
}

export class GetRulesByWorkspaceHandler implements IQueryHandler<
  GetRulesByWorkspaceQuery,
  QueryResult<PaginatedResult<CategoryRule>>
> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(
    query: GetRulesByWorkspaceQuery
  ): Promise<QueryResult<PaginatedResult<CategoryRule>>> {
    const result = await this.ruleService.getRulesByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      query.userId,
      { limit: query.limit, offset: query.offset }
    );

    return QueryResult.success(result);
  }
}
