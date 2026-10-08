import { IWorkspaceAccessPort } from '../ports/workspace-access.port';
import { authorizeWorkspaceRead } from './authorize-workspace-read';
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
  readonly userId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetExecutionsByWorkspaceHandler implements IQueryHandler<
  GetExecutionsByWorkspaceQuery,
  PaginatedResult<RuleExecutionDTO>
> {
  constructor(private readonly executionService: Pick<RuleExecutionService, 'getExecutionsByWorkspaceId'>, private readonly workspaceAccess: IWorkspaceAccessPort) {}

  async handle(query: GetExecutionsByWorkspaceQuery): Promise<PaginatedResult<RuleExecutionDTO>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    await authorizeWorkspaceRead(query.userId, workspaceId, this.workspaceAccess);
    return this.executionService.getExecutionsByWorkspaceId(
      workspaceId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
