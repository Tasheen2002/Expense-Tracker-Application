import { RuleExecution } from "../entities/rule-execution.entity";
import { RuleExecutionId } from "../value-objects/rule-execution-id";
import { RuleId } from "../value-objects/rule-id";
import {  WorkspaceId  } from '@core/domain/value-objects';
import {  ExpenseId  } from '@core/domain/value-objects';
import { CategorySuggestion } from "../entities/category-suggestion.entity";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IRuleExecutionRepository {
  save(execution: RuleExecution): Promise<void>;
  saveWithSuggestion(
    execution: RuleExecution,
    suggestion: CategorySuggestion,
  ): Promise<void>;
  findById(id: RuleExecutionId, workspaceId: WorkspaceId): Promise<RuleExecution | null>;
  findByRuleId(
    ruleId: RuleId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<RuleExecution>>;
  findByExpenseId(
    expenseId: ExpenseId,
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<RuleExecution>>;
  findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<RuleExecution>>;
  delete(id: RuleExecutionId): Promise<void>;
}
