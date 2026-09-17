import { RuleExecutionService } from '../services/rule-execution.service';
import {  WorkspaceId  } from '@core/domain/value-objects';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { RuleExecutionDTO } from '../../domain/entities/rule-execution.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetExecutionsByWorkspaceQuery extends IQuery {
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetExecutionsByWorkspaceHandler implements IQueryHandler<
  GetExecutionsByWorkspaceQuery,
  PaginatedResult<RuleExecutionDTO>
> {
  constructor(private readonly executionService: RuleExecutionService) {}

  async handle(query: GetExecutionsByWorkspaceQuery): Promise<PaginatedResult<RuleExecutionDTO>> {
    return this.executionService.getExecutionsByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      { limit: query.limit, offset: query.offset }
    );
  }
}
