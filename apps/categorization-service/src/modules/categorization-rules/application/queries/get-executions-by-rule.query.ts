import { IWorkspaceAccessPort } from '../ports/workspace-access.port';
import { authorizeWorkspaceRead } from './authorize-workspace-read';
import { RuleExecutionService } from '../services/rule-execution.service';
import { RuleId } from '../../domain/value-objects/rule-id';
import {  WorkspaceId  } from '@core/domain/value-objects';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { RuleExecutionDTO } from '../../domain/entities/rule-execution.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetExecutionsByRuleQuery extends IQuery {
  readonly ruleId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetExecutionsByRuleHandler implements IQueryHandler<
  GetExecutionsByRuleQuery,
  PaginatedResult<RuleExecutionDTO>
> {
  constructor(private readonly executionService: Pick<RuleExecutionService, 'getExecutionsByRuleId'>, private readonly workspaceAccess: IWorkspaceAccessPort) {}

  async handle(query: GetExecutionsByRuleQuery): Promise<PaginatedResult<RuleExecutionDTO>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    await authorizeWorkspaceRead(query.userId, workspaceId, this.workspaceAccess);
    return this.executionService.getExecutionsByRuleId(
      RuleId.fromString(query.ruleId),
      workspaceId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
