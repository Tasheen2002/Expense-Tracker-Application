import { RuleExecutionService } from '../services/rule-execution.service'
import { RuleId } from '../../domain/value-objects/rule-id'
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface'
import { RuleExecution } from '../../domain/entities/rule-execution.entity'
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs'

export interface GetExecutionsByRuleQuery extends IQuery {
  readonly ruleId: string
  readonly limit?: number
  readonly offset?: number
}

export class GetExecutionsByRuleHandler implements IQueryHandler<GetExecutionsByRuleQuery, PaginatedResult<RuleExecution>> {
  constructor(private readonly executionService: RuleExecutionService) {}

  async handle(
    query: GetExecutionsByRuleQuery,
  ): Promise<PaginatedResult<RuleExecution>> {
    return await this.executionService.getExecutionsByRuleId(
      RuleId.fromString(query.ruleId),
      { limit: query.limit, offset: query.offset },
    )
  }
}

