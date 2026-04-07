import { RuleExecutionId } from '../value-objects/rule-execution-id';
import { RuleId } from '../value-objects/rule-id';
import { WorkspaceId } from '../../../identity-workspace';
import { ExpenseId, CategoryId } from '../../../expense-ledger';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';

// ============================================================================
// Domain Events
// ============================================================================

export class RuleExecutedEvent extends DomainEvent {
  constructor(
    public readonly executionId: string,
    public readonly ruleId: string,
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly appliedCategoryId: string
  ) {
    super(executionId, 'RuleExecution');
  }

  get eventType(): string {
    return 'RuleExecuted';
  }

  getPayload(): Record<string, unknown> {
    return {
      executionId: this.executionId,
      ruleId: this.ruleId,
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      appliedCategoryId: this.appliedCategoryId,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

export class RuleExecution {
  private id: RuleExecutionId;
  private ruleId: RuleId;
  private expenseId: ExpenseId;
  private workspaceId: WorkspaceId;
  private appliedCategoryId: CategoryId;
  private executedAt: Date;

  private constructor(props: {
    id: RuleExecutionId;
    ruleId: RuleId;
    expenseId: ExpenseId;
    workspaceId: WorkspaceId;
    appliedCategoryId: CategoryId;
    executedAt: Date;
  }) {
    this.id = props.id;
    this.ruleId = props.ruleId;
    this.expenseId = props.expenseId;
    this.workspaceId = props.workspaceId;
    this.appliedCategoryId = props.appliedCategoryId;
    this.executedAt = props.executedAt;
  }

  static create(props: {
    ruleId: RuleId;
    expenseId: ExpenseId;
    workspaceId: WorkspaceId;
    appliedCategoryId: CategoryId;
  }): RuleExecution {
    const execution = new RuleExecution({
      id: RuleExecutionId.create(),
      ruleId: props.ruleId,
      expenseId: props.expenseId,
      workspaceId: props.workspaceId,
      appliedCategoryId: props.appliedCategoryId,
      executedAt: new Date(),
    });

    return execution;
  }

  static reconstitute(props: {
    id: RuleExecutionId;
    ruleId: RuleId;
    expenseId: ExpenseId;
    workspaceId: WorkspaceId;
    appliedCategoryId: CategoryId;
    executedAt: Date;
  }): RuleExecution {
    return new RuleExecution(props);
  }

  // Getters
  getId(): RuleExecutionId {
    return this.id;
  }

  getRuleId(): RuleId {
    return this.ruleId;
  }

  getExpenseId(): ExpenseId {
    return this.expenseId;
  }

  getWorkspaceId(): WorkspaceId {
    return this.workspaceId;
  }

  getAppliedCategoryId(): CategoryId {
    return this.appliedCategoryId;
  }

  getExecutedAt(): Date {
    return this.executedAt;
  }

  /**
   * Serialize RuleExecution to DTO for API responses.
   * Static method ensures serialization is separate from domain logic.
   */
  static toDTO(execution: RuleExecution): RuleExecutionDTO {
    return {
      id: execution.id.getValue(),
      ruleId: execution.ruleId.getValue(),
      expenseId: execution.expenseId.getValue(),
      workspaceId: execution.workspaceId.getValue(),
      appliedCategoryId: execution.appliedCategoryId.getValue(),
      executedAt: execution.executedAt,
    };
  }
}

export interface RuleExecutionDTO {
  id: string;
  ruleId: string;
  expenseId: string;
  workspaceId: string;
  appliedCategoryId: string;
  executedAt: Date;
}
