import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";

/**
 * Emitted when a new approval workflow is initiated.
 */
export class ApprovalWorkflowStartedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly requesterId: string,
    public readonly totalSteps: number,
  ) {
    super(workflowId, "ApprovalWorkflow");
  }

  get eventType(): string {
    return "approval.workflow_started";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      workflowId: this.workflowId,
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      requesterId: this.requesterId,
      totalSteps: this.totalSteps,
    };
  }
}

/**
 * Emitted when an approval step is completed.
 */
export class ApprovalStepCompletedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly stepId: string,
    public readonly approverId: string,
    public readonly stepNumber: number,
    public readonly decision: "approved" | "rejected",
    public readonly comment?: string,
  ) {
    super(workflowId, "ApprovalWorkflow");
  }

  get eventType(): string {
    return "approval.step_completed";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      workflowId: this.workflowId,
      stepId: this.stepId,
      approverId: this.approverId,
      stepNumber: this.stepNumber,
      decision: this.decision,
      comment: this.comment,
    };
  }
}

/**
 * Emitted when an approval workflow is fully approved.
 */
export class ApprovalWorkflowCompletedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly finalApproverId: string,
  ) {
    super(workflowId, "ApprovalWorkflow");
  }

  get eventType(): string {
    return "approval.workflow_completed";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      workflowId: this.workflowId,
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      finalApproverId: this.finalApproverId,
    };
  }
}

/**
 * Emitted when an approval workflow is rejected.
 */
export class ApprovalWorkflowRejectedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly rejectedBy: string,
    public readonly reason?: string,
  ) {
    super(workflowId, "ApprovalWorkflow");
  }

  get eventType(): string {
    return "approval.workflow_rejected";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      workflowId: this.workflowId,
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      rejectedBy: this.rejectedBy,
      reason: this.reason,
    };
  }
}

/**
 * Emitted when an approval workflow is cancelled.
 */
export class ApprovalWorkflowCancelledEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly cancelledBy: string,
    public readonly reason?: string,
  ) {
    super(workflowId, "ApprovalWorkflow");
  }

  get eventType(): string {
    return "approval.workflow_cancelled";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      workflowId: this.workflowId,
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      cancelledBy: this.cancelledBy,
      reason: this.reason,
    };
  }
}
