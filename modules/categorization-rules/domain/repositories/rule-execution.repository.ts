import { RuleExecution } from '../entities/rule-execution.entity'
import { RuleExecutionId } from '../value-objects/rule-execution-id'
import { RuleId } from '../value-objects/rule-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'

export interface RuleExecutionRepository {
  save(execution: RuleExecution): Promise<void>
  findById(id: RuleExecutionId): Promise<RuleExecution | null>
  findByRuleId(ruleId: RuleId): Promise<RuleExecution[]>
  findByExpenseId(expenseId: ExpenseId, workspaceId: WorkspaceId): Promise<RuleExecution[]>
  findByWorkspaceId(workspaceId: WorkspaceId, limit?: number): Promise<RuleExecution[]>
  delete(id: RuleExecutionId): Promise<void>
}
