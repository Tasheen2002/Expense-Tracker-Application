import { ApprovalStepId } from '../value-objects/approval-step-id'
import { ApprovalStatus } from '../enums/approval-status'
import { ApprovalAlreadyProcessedError } from '../errors/approval-workflow.errors'
import { WorkflowId } from '../value-objects/workflow-id'
import { UserId } from '../../../identity-workspace/domain/value-objects/user-id.vo'

export interface ApprovalStepProps {
  stepId: ApprovalStepId
  workflowId: WorkflowId
  stepNumber: number
  approverId: UserId
  delegatedTo?: UserId
  status: ApprovalStatus
  comments?: string
  processedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export class ApprovalStep {
  private props: ApprovalStepProps

  private constructor(props: ApprovalStepProps) {
    this.props = props
  }

  static create(params: {
    workflowId: string
    stepNumber: number
    approverId: string
  }): ApprovalStep {
    return new ApprovalStep({
      stepId: ApprovalStepId.create(),
      workflowId: WorkflowId.fromString(params.workflowId),
      stepNumber: params.stepNumber,
      approverId: UserId.fromString(params.approverId),
      status: ApprovalStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(props: ApprovalStepProps): ApprovalStep {
    return new ApprovalStep(props)
  }

  getId(): ApprovalStepId {
    return this.props.stepId
  }

  getWorkflowId(): WorkflowId {
    return this.props.workflowId
  }

  getStepNumber(): number {
    return this.props.stepNumber
  }

  getApproverId(): UserId {
    return this.props.approverId
  }

  getDelegatedTo(): UserId | undefined {
    return this.props.delegatedTo
  }

  getStatus(): ApprovalStatus {
    return this.props.status
  }

  getComments(): string | undefined {
    return this.props.comments
  }

  getProcessedAt(): Date | undefined {
    return this.props.processedAt
  }

  getCreatedAt(): Date {
    return this.props.createdAt
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt
  }

  isPending(): boolean {
    return this.props.status === ApprovalStatus.PENDING
  }

  isProcessed(): boolean {
    return [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.AUTO_APPROVED].includes(this.props.status)
  }

  getCurrentApproverId(): UserId {
    return this.props.delegatedTo || this.props.approverId
  }

  approve(comments?: string): void {
    if (this.isProcessed()) {
      throw new ApprovalAlreadyProcessedError(this.props.stepId.getValue())
    }

    this.props.status = ApprovalStatus.APPROVED
    this.props.comments = comments
    this.props.processedAt = new Date()
    this.props.updatedAt = new Date()
  }

  reject(comments?: string): void {
    if (this.isProcessed()) {
      throw new ApprovalAlreadyProcessedError(this.props.stepId.getValue())
    }

    if (!comments) {
      throw new Error('Rejection reason is required')
    }

    this.props.status = ApprovalStatus.REJECTED
    this.props.comments = comments
    this.props.processedAt = new Date()
    this.props.updatedAt = new Date()
  }

  delegate(toUserId: string): void {
    if (this.isProcessed()) {
      throw new ApprovalAlreadyProcessedError(this.props.stepId.getValue())
    }

    const delegatedUserId = UserId.fromString(toUserId)
    if (delegatedUserId.equals(this.props.approverId)) {
      throw new Error('Cannot delegate to the same approver')
    }

    this.props.delegatedTo = delegatedUserId
    this.props.status = ApprovalStatus.DELEGATED
    this.props.updatedAt = new Date()
  }

  autoApprove(): void {
    if (this.isProcessed()) {
      throw new ApprovalAlreadyProcessedError(this.props.stepId.getValue())
    }

    this.props.status = ApprovalStatus.AUTO_APPROVED
    this.props.comments = 'Auto-approved by system rules'
    this.props.processedAt = new Date()
    this.props.updatedAt = new Date()
  }
}
