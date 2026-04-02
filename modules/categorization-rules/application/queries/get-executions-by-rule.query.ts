import { RuleExecutionService } from '../services/rule-execution.service';
import { RuleId } from '../../domain/value-objects/rule-id';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { RuleExecution } from '../../domain/entities/rule-execution.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetExecutionsByRuleQuery extends IQuery {
  ruleId: string;
  limit?: number;
  offset?: number;
}

export class GetExecutionsByRuleHandler implements IQueryHandler<
  GetExecutionsByRuleQuery,
  QueryResult<PaginatedResult<RuleExecution>>
> {
  constructor(private readonly executionService: RuleExecutionService) {}

  async handle(
    query: GetExecutionsByRuleQuery
  ): Promise<QueryResult<PaginatedResult<RuleExecution>>> {
    const result = await this.executionService.getExecutionsByRuleId(
      RuleId.fromString(query.ruleId),
      { limit: query.limit, offset: query.offset }
    );

    return QueryResult.success(result);
  }
}
