import { RuleExecutionService } from '../services/rule-execution.service'
import { RuleId } from '../../domain/value-objects/rule-id'
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface'

export interface GetExecutionsByRuleQuery {
  ruleId: string
  limit?: number
  offset?: number
}

export class GetExecutionsByRuleHandler {
  constructor(private readonly executionService: RuleExecutionService) {}

  async execute(
    query: GetExecutionsByRuleQuery,
  ): Promise<PaginatedResult<any>> {
    const result = await this.executionService.getExecutionsByRuleId(
      RuleId.fromString(query.ruleId),
      { limit: query.limit, offset: query.offset },
    )

    return {
      items: result.items.map((execution) => ({
        id: execution.getId().getValue(),
        ruleId: execution.getRuleId().getValue(),
        expenseId: execution.getExpenseId().getValue(),
        workspaceId: execution.getWorkspaceId().getValue(),
        appliedCategoryId: execution.getAppliedCategoryId().getValue(),
        executedAt: execution.getExecutedAt(),
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    }
  }
}
