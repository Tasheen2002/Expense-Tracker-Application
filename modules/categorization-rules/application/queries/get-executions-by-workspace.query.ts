import { RuleExecutionService } from '../services/rule-execution.service';
import { WorkspaceId } from '../../../identity-workspace';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { RuleExecution, RuleExecutionDTO } from '../../domain/entities/rule-execution.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetExecutionsByWorkspaceQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class GetExecutionsByWorkspaceHandler implements IQueryHandler<
  GetExecutionsByWorkspaceQuery,
  QueryResult<PaginatedResult<RuleExecutionDTO>>
> {
  constructor(private readonly executionService: RuleExecutionService) {}

  async handle(
    query: GetExecutionsByWorkspaceQuery
  ): Promise<QueryResult<PaginatedResult<RuleExecutionDTO>>> {
    const result = await this.executionService.getExecutionsByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      { limit: query.limit, offset: query.offset }
    );

    return QueryResult.success({
      items: result.items.map(RuleExecution.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }
}
