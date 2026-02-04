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

  async execute(query: GetExecutionsByWorkspaceQuery) {
    const executions = await this.executionService.getExecutionsByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      query.limit,
    );

    return executions.map((execution) => ({
      id: execution.getId().getValue(),
      ruleId: execution.getRuleId().getValue(),
      expenseId: execution.getExpenseId().getValue(),
      workspaceId: execution.getWorkspaceId().getValue(),
      appliedCategoryId: execution.getAppliedCategoryId().getValue(),
      executedAt: execution.getExecutedAt(),
    }));
  }
}
