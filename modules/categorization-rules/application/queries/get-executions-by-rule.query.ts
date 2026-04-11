import { RuleExecutionService } from '../services/rule-execution.service';
import { RuleId } from '../../domain/value-objects/rule-id';
import { WorkspaceId } from '../../../identity-workspace';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { RuleExecutionDTO } from '../../domain/entities/rule-execution.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetExecutionsByRuleQuery extends IQuery {
  ruleId: string;
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class GetExecutionsByRuleHandler implements IQueryHandler<
  GetExecutionsByRuleQuery,
  PaginatedResult<RuleExecutionDTO>
> {
  constructor(private readonly executionService: RuleExecutionService) {}

  async handle(query: GetExecutionsByRuleQuery): Promise<PaginatedResult<RuleExecutionDTO>> {
    return this.executionService.getExecutionsByRuleId(
      RuleId.fromString(query.ruleId),
      WorkspaceId.fromString(query.workspaceId),
      { limit: query.limit, offset: query.offset }
    );
  }
}
