import { ApprovalStepId, WorkflowId } from '../value-objects';
import { ApprovalStatus } from '../enums';
import {
  ApprovalAlreadyProcessedError,
  RejectionReasonRequiredError,
  InvalidDelegationError,
  InvalidStepNumberError,
  ApprovalCommentTooLongError,
} from '../errors';
import {
  APPROVAL_COMMENTS_MAX_LENGTH,
  REJECTION_COMMENTS_MAX_LENGTH,
} from '../constants';
import { UserId } from '@core/domain/value-objects';

export interface ApprovalStepProps {
  stepId: ApprovalStepId;
  workflowId: WorkflowId;
  stepNumber: number;
  approverId: UserId;
  delegatedTo?: UserId;
  status: ApprovalStatus;
  comments?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApprovalStepData {
  workflowId: string;
  stepNumber: number;
  approverId: string;
}

export class ApprovalStep {
  private props: ApprovalStepProps;

  private constructor(props: ApprovalStepProps) {
    this.props = props;
  }

  private static validateStepNumber(stepNumber: number): void {
    if (
      typeof stepNumber !== 'number' ||
      !Number.isInteger(stepNumber) ||
      !Number.isFinite(stepNumber) ||
      stepNumber <= 0
    ) {
      throw new InvalidStepNumberError(stepNumber);
    }
  }

  static create(data: CreateApprovalStepData): ApprovalStep {
    ApprovalStep.validateStepNumber(data.stepNumber);
    return new ApprovalStep({
      stepId: ApprovalStepId.create(),
      workflowId: WorkflowId.fromString(data.workflowId),
      stepNumber: data.stepNumber,
      approverId: UserId.fromString(data.approverId),
      status: ApprovalStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: ApprovalStepProps): ApprovalStep {
    ApprovalStep.validateStepNumber(props.stepNumber);
    return new ApprovalStep(props);
  }

  get id(): ApprovalStepId {
    return this.props.stepId;
  }

  get workflowId(): WorkflowId {
    return this.props.workflowId;
  }

  get stepNumber(): number {
    return this.props.stepNumber;
  }

  get approverId(): UserId {
    return this.props.approverId;
  }

  get delegatedTo(): UserId | undefined {
    return this.props.delegatedTo;
  }

  get status(): ApprovalStatus {
    return this.props.status;
  }

  get comments(): string | undefined {
    return this.props.comments;
  }

  get processedAt(): Date | undefined {
    return this.props.processedAt
      ? new Date(this.props.processedAt.getTime())
      : undefined;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt.getTime());
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt.getTime());
  }

  isPending(): boolean {
    return this.props.status === ApprovalStatus.PENDING;
  }

  isProcessed(): boolean {
    return [
      ApprovalStatus.APPROVED,
      ApprovalStatus.REJECTED,
      ApprovalStatus.AUTO_APPROVED,
    ].includes(this.props.status);
  }

  getCurrentApproverId(): UserId {
    return this.props.delegatedTo || this.props.approverId;
  }

  approve(comments?: string): void {
    if (this.isProcessed()) {
      throw new ApprovalAlreadyProcessedError(this.props.stepId.getValue());
    }

    const trimmed = comments?.trim();
    if (trimmed && trimmed.length > APPROVAL_COMMENTS_MAX_LENGTH) {
      throw new ApprovalCommentTooLongError(APPROVAL_COMMENTS_MAX_LENGTH);
    }

    this.props.status = ApprovalStatus.APPROVED;
    this.props.comments = trimmed || undefined;
    this.props.processedAt = new Date();
    this.props.updatedAt = new Date();
  }

  reject(comments?: string): void {
    if (this.isProcessed()) {
      throw new ApprovalAlreadyProcessedError(this.props.stepId.getValue());
    }

    const trimmed = comments?.trim();
    if (!trimmed) {
      throw new RejectionReasonRequiredError();
    }
    if (trimmed.length > REJECTION_COMMENTS_MAX_LENGTH) {
      throw new ApprovalCommentTooLongError(REJECTION_COMMENTS_MAX_LENGTH);
    }

    this.props.status = ApprovalStatus.REJECTED;
    this.props.comments = trimmed;
    this.props.processedAt = new Date();
    this.props.updatedAt = new Date();
  }

  delegate(toUserId: string): void {
    if (this.isProcessed()) {
      throw new ApprovalAlreadyProcessedError(this.props.stepId.getValue());
    }

    const delegatedUserId = UserId.fromString(toUserId);
    if (delegatedUserId.equals(this.props.approverId)) {
      throw new InvalidDelegationError('Cannot delegate to the same approver');
    }

    if (this.props.delegatedTo && delegatedUserId.equals(this.props.delegatedTo)) {
      throw new InvalidDelegationError('Step is already delegated to this approver');
    }

    this.props.delegatedTo = delegatedUserId;
    this.props.status = ApprovalStatus.DELEGATED;
    this.props.updatedAt = new Date();
  }

  autoApprove(): void {
    if (this.isProcessed()) {
      throw new ApprovalAlreadyProcessedError(this.props.stepId.getValue());
    }

    this.props.status = ApprovalStatus.AUTO_APPROVED;
    this.props.comments = 'Auto-approved by system rules';
    this.props.processedAt = new Date();
    this.props.updatedAt = new Date();
  }

  equals(other: ApprovalStep): boolean {
    return this.props.stepId.equals(other.props.stepId);
  }

  toSnapshot(): ApprovalStepSnapshot {
    return Object.freeze({
      id: this.props.stepId,
      workflowId: this.props.workflowId,
      stepNumber: this.props.stepNumber,
      approverId: this.props.approverId,
      delegatedTo: this.props.delegatedTo,
      status: this.props.status,
      comments: this.props.comments,
      processedAt: this.props.processedAt
        ? new Date(this.props.processedAt.getTime())
        : undefined,
      createdAt: new Date(this.props.createdAt.getTime()),
      updatedAt: new Date(this.props.updatedAt.getTime()),
    });
  }

  toDTO(): ApprovalStepDTO {
    return ApprovalStep.toDTO(this);
  }

  static toDTO(step: ApprovalStep): ApprovalStepDTO {
    return {
      stepId: step.id.getValue(),
      workflowId: step.workflowId.getValue(),
      stepNumber: step.stepNumber,
      approverId: step.approverId.getValue(),
      delegatedTo: step.delegatedTo?.getValue(),
      status: step.status,
      comments: step.comments,
      processedAt: step.processedAt?.toISOString(),
      createdAt: step.createdAt.toISOString(),
      updatedAt: step.updatedAt.toISOString(),
    };
  }
}

export interface ApprovalStepSnapshot {
  readonly id: ApprovalStepId;
  readonly workflowId: WorkflowId;
  readonly stepNumber: number;
  readonly approverId: UserId;
  readonly delegatedTo?: UserId;
  readonly status: ApprovalStatus;
  readonly comments?: string;
  readonly processedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ApprovalStepDTO {
  stepId: string;
  workflowId: string;
  stepNumber: number;
  approverId: string;
  delegatedTo?: string;
  status: ApprovalStatus;
  comments?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}
