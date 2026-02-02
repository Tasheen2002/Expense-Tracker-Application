import { RuleExecutionId } from "../value-objects/rule-execution-id";
import { RuleId } from "../value-objects/rule-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { ExpenseId } from "../../../expense-ledger/domain/value-objects/expense-id";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events/domain-event";

// ============================================================================
// Domain Events
// ============================================================================

export class RuleExecutedEvent extends DomainEvent {
  constructor(
    public readonly executionId: string,
    public readonly ruleId: string,
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly appliedCategoryId: string,
  ) {
    super(executionId, "RuleExecution");
  }

  get eventType(): string {
    return "RuleExecuted";
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

export class RuleExecution extends AggregateRoot {
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
    super();
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

    execution.addDomainEvent(
      new RuleExecutedEvent(
        execution.id.getValue(),
        props.ruleId.getValue(),
        props.expenseId.getValue(),
        props.workspaceId.getValue(),
        props.appliedCategoryId.getValue(),
      ),
    );

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
}
