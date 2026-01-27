import { WorkflowStatus } from '../enums/workflow-status'
import { ApprovalStatus } from '../enums/approval-status'
import { ApprovalStep } from './approval-step.entity'
import { InvalidApprovalTransitionError, WorkflowStepNotFoundError } from '../errors/approval-workflow.errors'
import { WorkflowId } from '../value-objects/workflow-id'
import { ApprovalChainId } from '../value-objects/approval-chain-id'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { UserId } from '../../../identity-workspace/domain/value-objects/user-id.vo'

export interface ExpenseWorkflowProps {
  workflowId: WorkflowId
  expenseId: ExpenseId
  workspaceId: WorkspaceId
  userId: UserId
  chainId: ApprovalChainId
  status: WorkflowStatus
  currentStepNumber: number
  steps: ApprovalStep[]
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export class ExpenseWorkflow {
  private props: ExpenseWorkflowProps

  private constructor(props: ExpenseWorkflowProps) {
    this.props = props
  }

  static create(params: {
    expenseId: string
    workspaceId: string
    userId: string
    chainId: string
    approverSequence: string[]
  }): ExpenseWorkflow {
    const expenseId = ExpenseId.fromString(params.expenseId)
    const workspaceId = WorkspaceId.fromString(params.workspaceId)
    const userId = UserId.fromString(params.userId)
    const chainId = ApprovalChainId.fromString(params.chainId)

    const steps = params.approverSequence.map((approverId, index) =>
      ApprovalStep.create({
        workflowId: params.expenseId,
        stepNumber: index + 1,
        approverId,
      })
    )

    return new ExpenseWorkflow({
      workflowId: WorkflowId.create(),
      expenseId,
      workspaceId,
      userId,
      chainId,
      status: WorkflowStatus.PENDING,
      currentStepNumber: 1,
      steps,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(props: ExpenseWorkflowProps): ExpenseWorkflow {
    return new ExpenseWorkflow(props)
  }

  getId(): WorkflowId {
    return this.props.workflowId
  }

  getExpenseId(): ExpenseId {
    return this.props.expenseId
  }

  getWorkspaceId(): WorkspaceId {
    return this.props.workspaceId
  }

  getUserId(): UserId {
    return this.props.userId
  }

  getChainId(): ApprovalChainId {
    return this.props.chainId
  }

  getStatus(): WorkflowStatus {
    return this.props.status
  }

  getCurrentStepNumber(): number {
    return this.props.currentStepNumber
  }

  getSteps(): ApprovalStep[] {
    return this.props.steps
  }

  getCreatedAt(): Date {
    return this.props.createdAt
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt
  }

  getCompletedAt(): Date | undefined {
    return this.props.completedAt
  }

  getCurrentStep(): ApprovalStep | undefined {
    return this.props.steps.find(step => step.getStepNumber() === this.props.currentStepNumber)
  }

  isPending(): boolean {
    return this.props.status === WorkflowStatus.PENDING || this.props.status === WorkflowStatus.IN_PROGRESS
  }

  isCompleted(): boolean {
    return [WorkflowStatus.APPROVED, WorkflowStatus.REJECTED, WorkflowStatus.CANCELLED].includes(this.props.status)
  }

  start(): void {
    if (this.props.status !== WorkflowStatus.PENDING) {
      throw new InvalidApprovalTransitionError(this.props.status, WorkflowStatus.IN_PROGRESS)
    }

    this.props.status = WorkflowStatus.IN_PROGRESS
    this.props.updatedAt = new Date()
  }

  processStepApproval(stepNumber: number): void {
    const step = this.props.steps.find(s => s.getStepNumber() === stepNumber)
    if (!step) {
      throw new WorkflowStepNotFoundError(stepNumber)
    }

    if (!step.isProcessed() || step.getStatus() !== ApprovalStatus.APPROVED) {
      throw new InvalidApprovalTransitionError('pending', 'approved')
    }

    if (stepNumber === this.props.steps.length) {
      this.props.status = WorkflowStatus.APPROVED
      this.props.completedAt = new Date()
    } else {
      this.props.currentStepNumber = stepNumber + 1
      this.props.status = WorkflowStatus.IN_PROGRESS
    }

    this.props.updatedAt = new Date()
  }

  processStepRejection(): void {
    this.props.status = WorkflowStatus.REJECTED
    this.props.completedAt = new Date()
    this.props.updatedAt = new Date()
  }

  cancel(): void {
    if (this.isCompleted()) {
      throw new InvalidApprovalTransitionError(this.props.status, WorkflowStatus.CANCELLED)
    }

    this.props.status = WorkflowStatus.CANCELLED
    this.props.completedAt = new Date()
    this.props.updatedAt = new Date()
  }

  autoApproveAll(): void {
    this.props.steps.forEach(step => {
      if (!step.isProcessed()) {
        step.autoApprove()
      }
    })

    this.props.status = WorkflowStatus.APPROVED
    this.props.currentStepNumber = this.props.steps.length
    this.props.completedAt = new Date()
    this.props.updatedAt = new Date()
  }
}
