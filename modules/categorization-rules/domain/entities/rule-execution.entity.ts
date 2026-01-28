import { RuleExecutionId } from '../value-objects/rule-execution-id'
import { RuleId } from '../value-objects/rule-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id'

export class RuleExecution {
  private id: RuleExecutionId
  private ruleId: RuleId
  private expenseId: ExpenseId
  private workspaceId: WorkspaceId
  private appliedCategoryId: CategoryId
  private executedAt: Date

  private constructor(props: {
    id: RuleExecutionId
    ruleId: RuleId
    expenseId: ExpenseId
    workspaceId: WorkspaceId
    appliedCategoryId: CategoryId
    executedAt: Date
  }) {
    this.id = props.id
    this.ruleId = props.ruleId
    this.expenseId = props.expenseId
    this.workspaceId = props.workspaceId
    this.appliedCategoryId = props.appliedCategoryId
    this.executedAt = props.executedAt
  }

  static create(props: {
    ruleId: RuleId
    expenseId: ExpenseId
    workspaceId: WorkspaceId
    appliedCategoryId: CategoryId
  }): RuleExecution {
    return new RuleExecution({
      id: RuleExecutionId.create(),
      ruleId: props.ruleId,
      expenseId: props.expenseId,
      workspaceId: props.workspaceId,
      appliedCategoryId: props.appliedCategoryId,
      executedAt: new Date(),
    })
  }

  static reconstitute(props: {
    id: RuleExecutionId
    ruleId: RuleId
    expenseId: ExpenseId
    workspaceId: WorkspaceId
    appliedCategoryId: CategoryId
    executedAt: Date
  }): RuleExecution {
    return new RuleExecution(props)
  }

  // Getters
  getId(): RuleExecutionId {
    return this.id
  }

  getRuleId(): RuleId {
    return this.ruleId
  }

  getExpenseId(): ExpenseId {
    return this.expenseId
  }

  getWorkspaceId(): WorkspaceId {
    return this.workspaceId
  }

  getAppliedCategoryId(): CategoryId {
    return this.appliedCategoryId
  }

  getExecutedAt(): Date {
    return this.executedAt
  }
}
