import { ApprovalChainId } from '../value-objects/approval-chain-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id'

export interface ApprovalChainProps {
  chainId: ApprovalChainId
  workspaceId: WorkspaceId
  name: string
  description?: string
  minAmount?: number
  maxAmount?: number
  categoryIds?: CategoryId[]
  requiresReceipt: boolean
  approverSequence: string[] // Array of userId in order
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class ApprovalChain {
  private props: ApprovalChainProps

  private constructor(props: ApprovalChainProps) {
    this.props = props
  }

  static create(params: {
    workspaceId: string
    name: string
    description?: string
    minAmount?: number
    maxAmount?: number
    categoryIds?: string[]
    requiresReceipt: boolean
    approverSequence: string[]
  }): ApprovalChain {
    if (params.approverSequence.length === 0) {
      throw new Error('Approval chain must have at least one approver')
    }

    if (params.minAmount && params.maxAmount && params.minAmount > params.maxAmount) {
      throw new Error('Min amount cannot be greater than max amount')
    }

    return new ApprovalChain({
      chainId: ApprovalChainId.create(),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      name: params.name,
      description: params.description,
      minAmount: params.minAmount,
      maxAmount: params.maxAmount,
      categoryIds: params.categoryIds?.map(id => CategoryId.fromString(id)),
      requiresReceipt: params.requiresReceipt,
      approverSequence: params.approverSequence,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(props: ApprovalChainProps): ApprovalChain {
    return new ApprovalChain(props)
  }

  getId(): ApprovalChainId {
    return this.props.chainId
  }

  getWorkspaceId(): WorkspaceId {
    return this.props.workspaceId
  }

  getName(): string {
    return this.props.name
  }

  getDescription(): string | undefined {
    return this.props.description
  }

  getMinAmount(): number | undefined {
    return this.props.minAmount
  }

  getMaxAmount(): number | undefined {
    return this.props.maxAmount
  }

  getCategoryIds(): CategoryId[] | undefined {
    return this.props.categoryIds
  }

  requiresReceipt(): boolean {
    return this.props.requiresReceipt
  }

  getApproverSequence(): string[] {
    return this.props.approverSequence
  }

  isActive(): boolean {
    return this.props.isActive
  }

  getCreatedAt(): Date {
    return this.props.createdAt
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt
  }

  updateName(name: string): void {
    this.props.name = name
    this.props.updatedAt = new Date()
  }

  updateDescription(description?: string): void {
    this.props.description = description
    this.props.updatedAt = new Date()
  }

  updateAmountRange(minAmount?: number, maxAmount?: number): void {
    if (minAmount && maxAmount && minAmount > maxAmount) {
      throw new Error('Min amount cannot be greater than max amount')
    }
    this.props.minAmount = minAmount
    this.props.maxAmount = maxAmount
    this.props.updatedAt = new Date()
  }

  updateApproverSequence(approverSequence: string[]): void {
    if (approverSequence.length === 0) {
      throw new Error('Approval chain must have at least one approver')
    }
    this.props.approverSequence = approverSequence
    this.props.updatedAt = new Date()
  }

  activate(): void {
    this.props.isActive = true
    this.props.updatedAt = new Date()
  }

  deactivate(): void {
    this.props.isActive = false
    this.props.updatedAt = new Date()
  }

  appliesTo(params: {
    amount: number
    categoryId?: string
    hasReceipt: boolean
  }): boolean {
    if (!this.props.isActive) {
      return false
    }

    if (this.props.minAmount && params.amount < this.props.minAmount) {
      return false
    }

    if (this.props.maxAmount && params.amount > this.props.maxAmount) {
      return false
    }

    if (this.props.categoryIds && this.props.categoryIds.length > 0) {
      if (!params.categoryId || !this.props.categoryIds.some(id => id.getValue() === params.categoryId)) {
        return false
      }
    }

    if (this.props.requiresReceipt && !params.hasReceipt) {
      return false
    }

    return true
  }
}
