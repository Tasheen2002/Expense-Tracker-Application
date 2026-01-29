import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";

/**
 * Emitted when a new expense is created.
 */
export class ExpenseCreatedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly title: string,
  ) {
    super(expenseId, "Expense");
  }

  get eventType(): string {
    return "expense.created";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      userId: this.userId,
      amount: this.amount,
      currency: this.currency,
      title: this.title,
    };
  }
}

/**
 * Emitted when an expense is submitted for approval.
 */
export class ExpenseSubmittedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly submittedBy: string,
    public readonly amount: number,
    public readonly currency: string,
  ) {
    super(expenseId, "Expense");
  }

  get eventType(): string {
    return "expense.submitted";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      submittedBy: this.submittedBy,
      amount: this.amount,
      currency: this.currency,
    };
  }
}

/**
 * Emitted when an expense is approved.
 */
export class ExpenseApprovedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly approvedBy: string,
    public readonly amount: number,
    public readonly currency: string,
  ) {
    super(expenseId, "Expense");
  }

  get eventType(): string {
    return "expense.approved";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      approvedBy: this.approvedBy,
      amount: this.amount,
      currency: this.currency,
    };
  }
}

/**
 * Emitted when an expense is rejected.
 */
export class ExpenseRejectedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly rejectedBy: string,
    public readonly reason?: string,
  ) {
    super(expenseId, "Expense");
  }

  get eventType(): string {
    return "expense.rejected";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      rejectedBy: this.rejectedBy,
      reason: this.reason,
    };
  }
}

/**
 * Emitted when an expense is reimbursed.
 */
export class ExpenseReimbursedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly currency: string,
  ) {
    super(expenseId, "Expense");
  }

  get eventType(): string {
    return "expense.reimbursed";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      userId: this.userId,
      amount: this.amount,
      currency: this.currency,
    };
  }
}
