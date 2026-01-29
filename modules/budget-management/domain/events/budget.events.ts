import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";

/**
 * Emitted when a budget threshold is exceeded.
 */
export class BudgetThresholdExceededEvent extends DomainEvent {
  constructor(
    public readonly budgetId: string,
    public readonly workspaceId: string,
    public readonly threshold: number,
    public readonly currentSpending: number,
    public readonly budgetLimit: number,
    public readonly currency: string,
  ) {
    super(budgetId, "Budget");
  }

  get eventType(): string {
    return "budget.threshold_exceeded";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
      threshold: this.threshold,
      currentSpending: this.currentSpending,
      budgetLimit: this.budgetLimit,
      currency: this.currency,
    };
  }
}

/**
 * Emitted when a budget is fully consumed.
 */
export class BudgetExhaustedEvent extends DomainEvent {
  constructor(
    public readonly budgetId: string,
    public readonly workspaceId: string,
    public readonly budgetLimit: number,
    public readonly currency: string,
  ) {
    super(budgetId, "Budget");
  }

  get eventType(): string {
    return "budget.exhausted";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
      budgetLimit: this.budgetLimit,
      currency: this.currency,
    };
  }
}

/**
 * Emitted when spending is recorded against a budget.
 */
export class BudgetSpendingRecordedEvent extends DomainEvent {
  constructor(
    public readonly budgetId: string,
    public readonly workspaceId: string,
    public readonly expenseId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly newTotalSpending: number,
  ) {
    super(budgetId, "Budget");
  }

  get eventType(): string {
    return "budget.spending_recorded";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
      expenseId: this.expenseId,
      amount: this.amount,
      currency: this.currency,
      newTotalSpending: this.newTotalSpending,
    };
  }
}
