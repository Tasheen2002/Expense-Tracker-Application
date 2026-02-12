import { WorkflowStatus } from "../enums/workflow-status";
import { ApprovalStatus } from "../enums/approval-status";
import { ApprovalStep } from "./approval-step.entity";
import {
  InvalidApprovalTransitionError,
  WorkflowStepNotFoundError,
} from "../errors/approval-workflow.errors";
import { WorkflowId } from "../value-objects/workflow-id";
import { ApprovalChainId } from "../value-objects/approval-chain-id";
import { ExpenseId } from "../../../expense-ledger/domain/value-objects/expense-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";

// ============================================================================
// DOMAIN EVENTS
// ============================================================================

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

  getPayload(): Record<string, unknown> {
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

  getPayload(): Record<string, unknown> {
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

  getPayload(): Record<string, unknown> {
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

  getPayload(): Record<string, unknown> {
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

  getPayload(): Record<string, unknown> {
    return {
      workflowId: this.workflowId,
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      cancelledBy: this.cancelledBy,
      reason: this.reason,
    };
  }
}

// ============================================================================
// ENTITY
// ============================================================================

export interface ExpenseWorkflowProps {
  workflowId: WorkflowId;
  expenseId: ExpenseId;
  workspaceId: WorkspaceId;
  userId: UserId;
  chainId: ApprovalChainId;
  status: WorkflowStatus;
  currentStepNumber: number;
  steps: ApprovalStep[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export class ExpenseWorkflow extends AggregateRoot {
  private props: ExpenseWorkflowProps;

  private constructor(props: ExpenseWorkflowProps) {
    super();
    this.props = props;
  }

  static create(params: {
    expenseId: string;
    workspaceId: string;
    userId: string;
    chainId: string;
    approverSequence: string[];
  }): ExpenseWorkflow {
    const expenseId = ExpenseId.fromString(params.expenseId);
    const workspaceId = WorkspaceId.fromString(params.workspaceId);
    const userId = UserId.fromString(params.userId);
    const chainId = ApprovalChainId.fromString(params.chainId);

    // Create workflowId FIRST so it can be passed to steps
    const workflowId = WorkflowId.create();

    const steps = params.approverSequence.map((approverId, index) =>
      ApprovalStep.create({
        workflowId: workflowId.getValue(),
        stepNumber: index + 1,
        approverId,
      }),
    );

    const workflow = new ExpenseWorkflow({
      workflowId,
      expenseId,
      workspaceId,
      userId,
      chainId,
      status: WorkflowStatus.PENDING,
      currentStepNumber: 1,
      steps,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    workflow.addDomainEvent(
      new ApprovalWorkflowStartedEvent(
        workflowId.getValue(),
        expenseId.getValue(),
        workspaceId.getValue(),
        userId.getValue(),
        steps.length,
      ),
    );

    return workflow;
  }

  static reconstitute(props: ExpenseWorkflowProps): ExpenseWorkflow {
    return new ExpenseWorkflow(props);
  }

  getId(): WorkflowId {
    return this.props.workflowId;
  }

  getExpenseId(): ExpenseId {
    return this.props.expenseId;
  }

  getWorkspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  getUserId(): UserId {
    return this.props.userId;
  }

  getChainId(): ApprovalChainId {
    return this.props.chainId;
  }

  getStatus(): WorkflowStatus {
    return this.props.status;
  }

  getCurrentStepNumber(): number {
    return this.props.currentStepNumber;
  }

  getSteps(): ApprovalStep[] {
    return this.props.steps;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  getCompletedAt(): Date | undefined {
    return this.props.completedAt;
  }

  getCurrentStep(): ApprovalStep | undefined {
    return this.props.steps.find(
      (step) => step.getStepNumber() === this.props.currentStepNumber,
    );
  }

  isPending(): boolean {
    return (
      this.props.status === WorkflowStatus.PENDING ||
      this.props.status === WorkflowStatus.IN_PROGRESS
    );
  }

  isCompleted(): boolean {
    return [
      WorkflowStatus.APPROVED,
      WorkflowStatus.REJECTED,
      WorkflowStatus.CANCELLED,
    ].includes(this.props.status);
  }

  start(): void {
    if (this.props.status !== WorkflowStatus.PENDING) {
      throw new InvalidApprovalTransitionError(
        this.props.status,
        WorkflowStatus.IN_PROGRESS,
      );
    }

    this.props.status = WorkflowStatus.IN_PROGRESS;
    this.props.updatedAt = new Date();
  }

  processStepApproval(stepNumber: number): void {
    const step = this.props.steps.find((s) => s.getStepNumber() === stepNumber);
    if (!step) {
      throw new WorkflowStepNotFoundError(stepNumber);
    }

    if (!step.isProcessed() || step.getStatus() !== ApprovalStatus.APPROVED) {
      throw new InvalidApprovalTransitionError("pending", "approved");
    }

    this.addDomainEvent(
      new ApprovalStepCompletedEvent(
        this.props.workflowId.getValue(),
        step.getId().getValue(),
        step.getApproverId().getValue(),
        stepNumber,
        "approved",
        step.getComments(),
      ),
    );

    if (stepNumber === this.props.steps.length) {
      this.props.status = WorkflowStatus.APPROVED;
      this.props.completedAt = new Date();

      this.addDomainEvent(
        new ApprovalWorkflowCompletedEvent(
          this.props.workflowId.getValue(),
          this.props.expenseId.getValue(),
          this.props.workspaceId.getValue(),
          step.getApproverId().getValue(),
        ),
      );
    } else {
      this.props.currentStepNumber = stepNumber + 1;
      this.props.status = WorkflowStatus.IN_PROGRESS;
    }

    this.props.updatedAt = new Date();
  }

  processStepRejection(): void {
    this.props.status = WorkflowStatus.REJECTED;
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();

    const currentStep = this.getCurrentStep();
    const rejectedBy = currentStep
      ? currentStep.getApproverId().getValue()
      : "System";
    const reason = currentStep ? currentStep.getComments() : "Unknown";

    this.addDomainEvent(
      new ApprovalWorkflowRejectedEvent(
        this.props.workflowId.getValue(),
        this.props.expenseId.getValue(),
        this.props.workspaceId.getValue(),
        rejectedBy,
        reason,
      ),
    );
  }

  cancel(): void {
    if (this.isCompleted()) {
      throw new InvalidApprovalTransitionError(
        this.props.status,
        WorkflowStatus.CANCELLED,
      );
    }

    this.props.status = WorkflowStatus.CANCELLED;
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ApprovalWorkflowCancelledEvent(
        this.props.workflowId.getValue(),
        this.props.expenseId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.userId.getValue(),
        "Cancelled by user",
      ),
    );
  }

  autoApproveAll(): void {
    this.props.steps.forEach((step) => {
      if (!step.isProcessed()) {
        step.autoApprove();

        this.addDomainEvent(
          new ApprovalStepCompletedEvent(
            this.props.workflowId.getValue(),
            step.getId().getValue(),
            "System",
            step.getStepNumber(),
            "approved",
            "Auto-approved",
          ),
        );
      }
    });

    this.props.status = WorkflowStatus.APPROVED;
    this.props.currentStepNumber = this.props.steps.length;
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ApprovalWorkflowCompletedEvent(
        this.props.workflowId.getValue(),
        this.props.expenseId.getValue(),
        this.props.workspaceId.getValue(),
        "System",
      ),
    );
  }
}
