import { RuleExecutionService } from '../services/rule-execution.service';
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { RuleExecution } from '../../domain/entities/rule-execution.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetExecutionsByWorkspaceQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class GetExecutionsByWorkspaceHandler implements IQueryHandler<
  GetExecutionsByWorkspaceQuery,
  QueryResult<PaginatedResult<RuleExecution>>
> {
  constructor(private readonly executionService: RuleExecutionService) {}

  async handle(
    query: GetExecutionsByWorkspaceQuery
  ): Promise<QueryResult<PaginatedResult<RuleExecution>>> {
    const result = await this.executionService.getExecutionsByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      { limit: query.limit, offset: query.offset }
    );

    return QueryResult.success(result);
  }
}
