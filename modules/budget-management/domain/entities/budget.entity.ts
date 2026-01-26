import { BudgetId } from '../value-objects/budget-id'
import { BudgetPeriod } from '../value-objects/budget-period'
import { BudgetStatus, isValidStatusTransition } from '../enums/budget-status'
import { BudgetPeriodType } from '../enums/budget-period-type'
import { Decimal } from '@prisma/client/runtime/library'

export interface BudgetProps {
  id: BudgetId
  workspaceId: string
  name: string
  description: string | null
  totalAmount: Decimal
  currency: string
  period: BudgetPeriod
  status: BudgetStatus
  createdBy: string
  isRecurring: boolean
  rolloverUnused: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateBudgetData {
  workspaceId: string
  name: string
  description?: string
  totalAmount: number | string | Decimal
  currency: string
  periodType: BudgetPeriodType
  startDate: Date
  endDate?: Date
  createdBy: string
  isRecurring?: boolean
  rolloverUnused?: boolean
}

export class Budget {
  private constructor(private props: BudgetProps) {}

  static create(data: CreateBudgetData): Budget {
    // Validate name
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Budget name is required')
    }
    if (data.name.length > 255) {
      throw new Error('Budget name cannot exceed 255 characters')
    }

    // Validate total amount
    const totalAmount = typeof data.totalAmount === 'number' || typeof data.totalAmount === 'string'
      ? new Decimal(data.totalAmount)
      : data.totalAmount

    if (totalAmount.isNegative() || totalAmount.isZero()) {
      throw new Error('Total amount must be greater than zero')
    }

    if (totalAmount.decimalPlaces() > 2) {
      throw new Error('Total amount cannot have more than 2 decimal places')
    }

    // Validate currency
    if (!data.currency || data.currency.length !== 3) {
      throw new Error('Currency must be a valid 3-letter ISO code')
    }

    // Create budget period
    const period = BudgetPeriod.create(data.startDate, data.periodType, data.endDate)

    const now = new Date()

    return new Budget({
      id: BudgetId.create(),
      workspaceId: data.workspaceId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      totalAmount,
      currency: data.currency.toUpperCase(),
      period,
      status: BudgetStatus.DRAFT,
      createdBy: data.createdBy,
      isRecurring: data.isRecurring ?? false,
      rolloverUnused: data.rolloverUnused ?? false,
      createdAt: now,
      updatedAt: now,
    })
  }

  static fromPersistence(props: BudgetProps): Budget {
    return new Budget(props)
  }

  // Getters
  getId(): BudgetId {
    return this.props.id
  }

  getWorkspaceId(): string {
    return this.props.workspaceId
  }

  getName(): string {
    return this.props.name
  }

  getDescription(): string | null {
    return this.props.description
  }

  getTotalAmount(): Decimal {
    return this.props.totalAmount
  }

  getCurrency(): string {
    return this.props.currency
  }

  getPeriod(): BudgetPeriod {
    return this.props.period
  }

  getStatus(): BudgetStatus {
    return this.props.status
  }

  getCreatedBy(): string {
    return this.props.createdBy
  }

  isRecurring(): boolean {
    return this.props.isRecurring
  }

  shouldRolloverUnused(): boolean {
    return this.props.rolloverUnused
  }

  getCreatedAt(): Date {
    return this.props.createdAt
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt
  }

  // Business logic methods
  updateName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Budget name is required')
    }
    if (newName.length > 255) {
      throw new Error('Budget name cannot exceed 255 characters')
    }
    this.props.name = newName.trim()
    this.props.updatedAt = new Date()
  }

  updateDescription(description: string | null): void {
    this.props.description = description?.trim() || null
    this.props.updatedAt = new Date()
  }

  updateTotalAmount(amount: number | string | Decimal): void {
    const newAmount = typeof amount === 'number' || typeof amount === 'string'
      ? new Decimal(amount)
      : amount

    if (newAmount.isNegative() || newAmount.isZero()) {
      throw new Error('Total amount must be greater than zero')
    }

    if (newAmount.decimalPlaces() > 2) {
      throw new Error('Total amount cannot have more than 2 decimal places')
    }

    this.props.totalAmount = newAmount
    this.props.updatedAt = new Date()
  }

  activate(): void {
    if (!isValidStatusTransition(this.props.status, BudgetStatus.ACTIVE)) {
      throw new Error(`Cannot activate budget with status ${this.props.status}`)
    }
    this.props.status = BudgetStatus.ACTIVE
    this.props.updatedAt = new Date()
  }

  markAsExceeded(): void {
    if (this.props.status !== BudgetStatus.ACTIVE) {
      throw new Error('Only active budgets can be marked as exceeded')
    }
    this.props.status = BudgetStatus.EXCEEDED
    this.props.updatedAt = new Date()
  }

  archive(): void {
    if (!isValidStatusTransition(this.props.status, BudgetStatus.ARCHIVED)) {
      throw new Error(`Cannot archive budget with status ${this.props.status}`)
    }
    this.props.status = BudgetStatus.ARCHIVED
    this.props.updatedAt = new Date()
  }

  isActive(): boolean {
    return this.props.status === BudgetStatus.ACTIVE && this.props.period.isActive()
  }

  isDraft(): boolean {
    return this.props.status === BudgetStatus.DRAFT
  }

  isArchived(): boolean {
    return this.props.status === BudgetStatus.ARCHIVED
  }

  isExceeded(): boolean {
    return this.props.status === BudgetStatus.EXCEEDED
  }

  hasExpired(): boolean {
    return this.props.period.hasEnded()
  }

  equals(other: Budget): boolean {
    return this.props.id.equals(other.props.id)
  }
}
