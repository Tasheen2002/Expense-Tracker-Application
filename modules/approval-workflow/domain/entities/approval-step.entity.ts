import { ApprovalStepId } from '../value-objects/approval-step-id';
import { ApprovalStatus } from '../enums/approval-status';
import {
  ApprovalAlreadyProcessedError,
  RejectionReasonRequiredError,
  InvalidDelegationError,
} from '../errors/approval-workflow.errors';
import { WorkflowId } from '../value-objects/workflow-id';
import { UserId } from '../../../identity-workspace';

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

  static create(data: CreateApprovalStepData): ApprovalStep {
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
    return this.props.processedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
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

    this.props.status = ApprovalStatus.APPROVED;
    this.props.comments = comments;
    this.props.processedAt = new Date();
    this.props.updatedAt = new Date();
  }

  reject(comments?: string): void {
    if (this.isProcessed()) {
      throw new ApprovalAlreadyProcessedError(this.props.stepId.getValue());
    }

    if (!comments) {
      throw new RejectionReasonRequiredError();
    }

    this.props.status = ApprovalStatus.REJECTED;
    this.props.comments = comments;
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
