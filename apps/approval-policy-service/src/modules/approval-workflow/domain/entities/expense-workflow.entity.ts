import { WorkflowId, ApprovalChainId } from '../value-objects';
import { ExpenseId, WorkspaceId, UserId } from '@core/domain/value-objects';
import { WorkflowStatus, ApprovalStatus } from '../enums';
import { ApprovalStep, ApprovalStepDTO, ApprovalStepSnapshot } from './approval-step.entity';
import {
  InvalidApprovalTransitionError,
  WorkflowStepNotFoundError,
  CurrentStepNotFoundError,
  WorkflowAlreadyCompletedError,
  EmptyApproverSequenceError,
  MaxApproversExceededError,
  DuplicateApproversInSequenceError,
  SelfApprovalNotAllowedError,
  ConcurrencyConflictError,
} from '../errors';
import {
  MIN_APPROVERS,
  MAX_APPROVERS,
  INITIAL_STEP_NUMBER,
  INITIAL_WORKFLOW_VERSION,
} from '../constants';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { APPROVAL_POLICY_EVENTS } from '../../../../shared/events/approval-policy-events';

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
    public readonly totalSteps: number
  ) {
    super(workflowId, 'ApprovalWorkflow');
  }

  get eventType(): string {
    return APPROVAL_POLICY_EVENTS.WORKFLOW_STARTED;
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
    public readonly decision: 'approved' | 'rejected',
    public readonly comment?: string
  ) {
    super(workflowId, 'ApprovalWorkflow');
  }

  get eventType(): string {
    return APPROVAL_POLICY_EVENTS.WORKFLOW_STEP_COMPLETED;
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
    public readonly finalApproverId: string
  ) {
    super(workflowId, 'ApprovalWorkflow');
  }

  get eventType(): string {
    return APPROVAL_POLICY_EVENTS.WORKFLOW_COMPLETED;
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
    public readonly reason?: string
  ) {
    super(workflowId, 'ApprovalWorkflow');
  }

  get eventType(): string {
    return APPROVAL_POLICY_EVENTS.WORKFLOW_REJECTED;
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
 * Emitted when an approval step is delegated to another approver.
 */
export class ApprovalStepDelegatedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly stepId: string,
    public readonly fromApproverId: string,
    public readonly toApproverId: string
  ) {
    super(workflowId, 'ApprovalWorkflow');
  }

  get eventType(): string {
    return APPROVAL_POLICY_EVENTS.WORKFLOW_STEP_DELEGATED;
  }

  getPayload(): Record<string, unknown> {
    return {
      stepId: this.stepId,
      workflowId: this.workflowId,
      fromApproverId: this.fromApproverId,
      toApproverId: this.toApproverId,
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
    public readonly reason?: string
  ) {
    super(workflowId, 'ApprovalWorkflow');
  }

  get eventType(): string {
    return APPROVAL_POLICY_EVENTS.WORKFLOW_CANCELLED;
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
  version: number;
  steps: ApprovalStep[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateExpenseWorkflowData {
  expenseId: string;
  workspaceId: string;
  userId: string;
  chainId: string;
  approverSequence: string[];
}

export class ExpenseWorkflow extends AggregateRoot {
  private props: ExpenseWorkflowProps;

  private constructor(props: ExpenseWorkflowProps) {
    super();
    this.props = props;
  }

  static create(data: CreateExpenseWorkflowData): ExpenseWorkflow {
    const expenseId = ExpenseId.fromString(data.expenseId);
    const workspaceId = WorkspaceId.fromString(data.workspaceId);
    const userId = UserId.fromString(data.userId);
    const chainId = ApprovalChainId.fromString(data.chainId);

    if (!data.approverSequence || data.approverSequence.length < MIN_APPROVERS) {
      throw new EmptyApproverSequenceError();
    }

    if (data.approverSequence.length > MAX_APPROVERS) {
      throw new MaxApproversExceededError(MAX_APPROVERS);
    }

    const normalizedSequence = data.approverSequence.map((id) =>
      UserId.fromString(id).getValue()
    );

    if (new Set(normalizedSequence).size !== normalizedSequence.length) {
      throw new DuplicateApproversInSequenceError();
    }

    if (normalizedSequence.includes(userId.getValue())) {
      throw new SelfApprovalNotAllowedError(userId.getValue());
    }

    // Create workflowId FIRST so it can be passed to steps
    const workflowId = WorkflowId.create();

    const steps = normalizedSequence.map((approverId, index) =>
      ApprovalStep.create({
        workflowId: workflowId.getValue(),
        stepNumber: index + 1,
        approverId,
      })
    );

    const workflow = new ExpenseWorkflow({
      workflowId,
      expenseId,
      workspaceId,
      userId,
      chainId,
      status: WorkflowStatus.PENDING,
      currentStepNumber: INITIAL_STEP_NUMBER,
      version: INITIAL_WORKFLOW_VERSION,
      steps,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return workflow;
  }

  static fromPersistence(props: ExpenseWorkflowProps): ExpenseWorkflow {
    return new ExpenseWorkflow(props);
  }

  get id(): WorkflowId {
    return this.props.workflowId;
  }

  get expenseId(): ExpenseId {
    return this.props.expenseId;
  }

  get workspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get chainId(): ApprovalChainId {
    return this.props.chainId;
  }

  get status(): WorkflowStatus {
    return this.props.status;
  }

  get currentStepNumber(): number {
    return this.props.currentStepNumber;
  }

  get version(): number {
    return this.props.version;
  }

  synchronizeVersion(newVersion: number): void {
    if (
      !Number.isInteger(newVersion) ||
      newVersion !== this.props.version + 1
    ) {
      throw new ConcurrencyConflictError(this.props.workflowId.getValue());
    }
    this.props.version = newVersion;
  }

  get steps(): readonly ApprovalStepDTO[] {
    return Object.freeze(
      this.props.steps.map((step) => Object.freeze(ApprovalStep.toDTO(step)))
    );
  }

  /**
   * Immutable step snapshots for persistence mapping.
   */
  getStepSnapshots(): readonly ApprovalStepSnapshot[] {
    return Object.freeze(
      this.props.steps.map((step) => step.toSnapshot())
    );
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt.getTime());
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt.getTime());
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt
      ? new Date(this.props.completedAt.getTime())
      : undefined;
  }

  getCurrentStep(): ApprovalStepDTO | undefined {
    const current = this.getCurrentStepEntity();
    return current ? Object.freeze(ApprovalStep.toDTO(current)) : undefined;
  }

  private getCurrentStepEntity(): ApprovalStep | undefined {
    return this.props.steps.find(
      (step) => step.stepNumber === this.props.currentStepNumber
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
    if (this.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        this.props.expenseId.getValue(),
        this.props.status
      );
    }

    if (this.props.status !== WorkflowStatus.PENDING) {
      throw new InvalidApprovalTransitionError(
        this.props.status,
        WorkflowStatus.IN_PROGRESS
      );
    }

    this.props.status = WorkflowStatus.IN_PROGRESS;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ApprovalWorkflowStartedEvent(
        this.props.workflowId.getValue(),
        this.props.expenseId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.userId.getValue(),
        this.props.steps.length
      )
    );
  }

  approveCurrentStep(comments?: string): void {
    if (this.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        this.props.expenseId.getValue(),
        this.props.status
      );
    }

    if (this.props.status !== WorkflowStatus.IN_PROGRESS) {
      throw new InvalidApprovalTransitionError(
        this.props.status,
        WorkflowStatus.IN_PROGRESS
      );
    }

    const currentStep = this.getCurrentStepEntity();
    if (!currentStep) {
      throw new CurrentStepNotFoundError(this.props.expenseId.getValue());
    }

    currentStep.approve(comments);
    this.processStepApproval(currentStep.stepNumber);
  }

  rejectCurrentStep(comments: string): void {
    if (this.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        this.props.expenseId.getValue(),
        this.props.status
      );
    }

    if (this.props.status !== WorkflowStatus.IN_PROGRESS) {
      throw new InvalidApprovalTransitionError(
        this.props.status,
        WorkflowStatus.REJECTED
      );
    }

    const currentStep = this.getCurrentStepEntity();
    if (!currentStep) {
      throw new CurrentStepNotFoundError(this.props.expenseId.getValue());
    }

    currentStep.reject(comments);
    this.processStepRejection();
  }

  processStepApproval(stepNumber: number): void {
    if (this.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        this.props.expenseId.getValue(),
        this.props.status
      );
    }

    if (this.props.status !== WorkflowStatus.IN_PROGRESS) {
      throw new InvalidApprovalTransitionError(
        this.props.status,
        WorkflowStatus.IN_PROGRESS
      );
    }

    // Invariant: steps must be approved strictly in sequence
    if (stepNumber !== this.props.currentStepNumber) {
      throw new InvalidApprovalTransitionError(
        `step ${stepNumber}`,
        `current step is ${this.props.currentStepNumber}`
      );
    }

    const step = this.props.steps.find((s) => s.stepNumber === stepNumber);
    if (!step) {
      throw new WorkflowStepNotFoundError(stepNumber);
    }

    if (!step.isProcessed() || step.status !== ApprovalStatus.APPROVED) {
      throw new InvalidApprovalTransitionError('pending', 'approved');
    }

    const deciderId = step.getCurrentApproverId().getValue();

    this.addDomainEvent(
      new ApprovalStepCompletedEvent(
        this.props.workflowId.getValue(),
        step.id.getValue(),
        deciderId,
        stepNumber,
        'approved',
        step.comments
      )
    );

    if (stepNumber === this.props.steps.length) {
      this.props.status = WorkflowStatus.APPROVED;
      this.props.completedAt = new Date();

      this.addDomainEvent(
        new ApprovalWorkflowCompletedEvent(
          this.props.workflowId.getValue(),
          this.props.expenseId.getValue(),
          this.props.workspaceId.getValue(),
          deciderId
        )
      );
    } else {
      this.props.currentStepNumber = stepNumber + 1;
      this.props.status = WorkflowStatus.IN_PROGRESS;
    }

    this.props.updatedAt = new Date();
  }

  processStepRejection(): void {
    if (this.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        this.props.expenseId.getValue(),
        this.props.status
      );
    }

    if (this.props.status !== WorkflowStatus.IN_PROGRESS) {
      throw new InvalidApprovalTransitionError(
        this.props.status,
        WorkflowStatus.REJECTED
      );
    }

    const currentStep = this.getCurrentStepEntity();
    if (!currentStep) {
      throw new CurrentStepNotFoundError(this.props.expenseId.getValue());
    }

    if (!currentStep.isProcessed() || currentStep.status !== ApprovalStatus.REJECTED) {
      throw new InvalidApprovalTransitionError(
        currentStep.status,
        ApprovalStatus.REJECTED
      );
    }

    const rejectedBy = currentStep.getCurrentApproverId().getValue();
    const reason = currentStep.comments;

    this.addDomainEvent(
      new ApprovalStepCompletedEvent(
        this.props.workflowId.getValue(),
        currentStep.id.getValue(),
        rejectedBy,
        currentStep.stepNumber,
        'rejected',
        currentStep.comments
      )
    );

    this.props.status = WorkflowStatus.REJECTED;
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ApprovalWorkflowRejectedEvent(
        this.props.workflowId.getValue(),
        this.props.expenseId.getValue(),
        this.props.workspaceId.getValue(),
        rejectedBy,
        reason
      )
    );
  }

  delegateCurrentStep(toUserId: string): void {
    if (this.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        this.props.expenseId.getValue(),
        this.props.status
      );
    }

    if (this.props.status !== WorkflowStatus.IN_PROGRESS) {
      throw new InvalidApprovalTransitionError(
        this.props.status,
        WorkflowStatus.IN_PROGRESS
      );
    }

    this.delegateStep(this.props.currentStepNumber, toUserId);
  }

  delegateStep(stepNumber: number, toUserId: string): void {
    if (this.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        this.props.expenseId.getValue(),
        this.props.status
      );
    }

    if (this.props.status !== WorkflowStatus.IN_PROGRESS) {
      throw new InvalidApprovalTransitionError(
        this.props.status,
        WorkflowStatus.IN_PROGRESS
      );
    }

    if (stepNumber !== this.props.currentStepNumber) {
      throw new InvalidApprovalTransitionError(
        `delegate step ${stepNumber}`,
        `current step is ${this.props.currentStepNumber}`
      );
    }

    const step = this.props.steps.find((s) => s.stepNumber === stepNumber);
    if (!step) {
      throw new WorkflowStepNotFoundError(stepNumber);
    }

    const delegatedUserId = UserId.fromString(toUserId);
    if (delegatedUserId.equals(this.props.userId)) {
      throw new SelfApprovalNotAllowedError(delegatedUserId.getValue());
    }

    const fromApproverId = step.getCurrentApproverId().getValue();
    step.delegate(toUserId);

    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ApprovalStepDelegatedEvent(
        this.props.workflowId.getValue(),
        step.id.getValue(),
        fromApproverId,
        step.getCurrentApproverId().getValue()
      )
    );
  }

  cancel(actorId: string, reason?: string): void {
    if (this.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        this.props.expenseId.getValue(),
        this.props.status
      );
    }

    const cancelledBy = actorId;
    const cancellationReason = reason || 'Cancelled by user';

    this.props.status = WorkflowStatus.CANCELLED;
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ApprovalWorkflowCancelledEvent(
        this.props.workflowId.getValue(),
        this.props.expenseId.getValue(),
        this.props.workspaceId.getValue(),
        cancelledBy,
        cancellationReason
      )
    );
  }

  autoApproveAll(): void {
    if (this.isCompleted()) {
      throw new WorkflowAlreadyCompletedError(
        this.props.expenseId.getValue(),
        this.props.status
      );
    }

    this.props.steps.forEach((step) => {
      if (!step.isProcessed()) {
        step.autoApprove();

        this.addDomainEvent(
          new ApprovalStepCompletedEvent(
            this.props.workflowId.getValue(),
            step.id.getValue(),
            'System',
            step.stepNumber,
            'approved',
            'Auto-approved'
          )
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
        'System'
      )
    );
  }

  equals(other: ExpenseWorkflow): boolean {
    return this.props.workflowId.equals(other.props.workflowId);
  }

  toDTO(): ExpenseWorkflowDTO {
    return ExpenseWorkflow.toDTO(this);
  }

  static toDTO(workflow: ExpenseWorkflow): ExpenseWorkflowDTO {
    return {
      workflowId: workflow.id.getValue(),
      expenseId: workflow.expenseId.getValue(),
      workspaceId: workflow.workspaceId.getValue(),
      userId: workflow.userId.getValue(),
      chainId: workflow.chainId?.getValue(),
      status: workflow.status,
      currentStepNumber: workflow.currentStepNumber,
      version: workflow.version,
      steps: workflow.props.steps.map((s) => ApprovalStep.toDTO(s)),
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
      completedAt: workflow.completedAt?.toISOString(),
    };
  }
}

export interface ExpenseWorkflowDTO {
  workflowId: string;
  expenseId: string;
  workspaceId: string;
  userId: string;
  chainId?: string;
  status: WorkflowStatus;
  currentStepNumber: number;
  version: number;
  steps: ApprovalStepDTO[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
