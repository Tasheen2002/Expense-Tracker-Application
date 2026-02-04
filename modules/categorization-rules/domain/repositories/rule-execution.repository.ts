import { RuleExecution } from "../entities/rule-execution.entity";
import { RuleExecutionId } from "../value-objects/rule-execution-id";
import { RuleId } from "../value-objects/rule-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { ExpenseId } from "../../../expense-ledger/domain/value-objects/expense-id";
import { CategorySuggestion } from "../entities/category-suggestion.entity";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PaginationOptions } from "../../../../apps/api/src/shared/domain/interfaces/pagination-options.interface";

export interface RuleExecutionRepository {
  save(execution: RuleExecution): Promise<void>;
  saveWithSuggestion(
    execution: RuleExecution,
    suggestion: CategorySuggestion,
  ): Promise<void>;
  findById(id: RuleExecutionId): Promise<RuleExecution | null>;
  findByRuleId(
    ruleId: RuleId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<RuleExecution>>;
  findByExpenseId(
    expenseId: ExpenseId,
    workspaceId: WorkspaceId,
  ): Promise<RuleExecution[]>;
  findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<RuleExecution>>;
  delete(id: RuleExecutionId): Promise<void>;
}
