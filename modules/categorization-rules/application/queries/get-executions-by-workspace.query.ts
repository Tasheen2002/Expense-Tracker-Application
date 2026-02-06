import { RuleExecutionService } from "../services/rule-execution.service";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface GetExecutionsByWorkspaceQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class GetExecutionsByWorkspaceHandler {
  constructor(private readonly executionService: RuleExecutionService) {}

  async execute(
    query: GetExecutionsByWorkspaceQuery,
  ): Promise<PaginatedResult<any>> {
    const result = await this.executionService.getExecutionsByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      { limit: query.limit, offset: query.offset },
    );

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
    };
  }
}
