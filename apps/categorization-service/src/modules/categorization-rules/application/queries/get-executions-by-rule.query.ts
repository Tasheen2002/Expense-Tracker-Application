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
  readonly limit?: number;
  readonly offset?: number;
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
