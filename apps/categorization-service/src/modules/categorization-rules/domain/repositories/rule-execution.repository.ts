import { RuleExecution } from "../entities/rule-execution.entity";
import { RuleExecutionId } from "../value-objects/rule-execution-id";
import { RuleId } from "../value-objects/rule-id";
import {  WorkspaceId  } from '@core/domain/value-objects';
import {  ExpenseId  } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IRuleExecutionRepository {
  findById(id: RuleExecutionId, workspaceId: WorkspaceId): Promise<RuleExecution | null>;
  findByRuleId(
    ruleId: RuleId,
    workspaceId: WorkspaceId,
    options?: Pick<PaginationOptions, 'limit' | 'offset'>,
  ): Promise<PaginatedResult<RuleExecution>>;
  findByExpenseId(
    expenseId: ExpenseId,
    workspaceId: WorkspaceId,
    options?: Pick<PaginationOptions, 'limit' | 'offset'>,
  ): Promise<PaginatedResult<RuleExecution>>;
  findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: Pick<PaginationOptions, 'limit' | 'offset'>,
  ): Promise<PaginatedResult<RuleExecution>>;
}
