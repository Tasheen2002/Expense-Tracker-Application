import { CategoryRuleService } from '../services/category-rule.service';
import { WorkspaceId } from '../../../identity-workspace';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { CategoryRuleDTO } from '../../domain/entities/category-rule.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetRulesByWorkspaceQuery extends IQuery {
  readonly workspaceId: string;
  readonly userId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetRulesByWorkspaceHandler implements IQueryHandler<
  GetRulesByWorkspaceQuery,
  PaginatedResult<CategoryRuleDTO>
> {
  constructor(private readonly ruleService: CategoryRuleService) {}

  async handle(query: GetRulesByWorkspaceQuery): Promise<PaginatedResult<CategoryRuleDTO>> {
    return this.ruleService.getRulesByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      query.userId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
