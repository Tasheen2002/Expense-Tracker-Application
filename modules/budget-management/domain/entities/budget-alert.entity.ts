import { AlertId } from '../value-objects/alert-id'
import { BudgetId } from '../value-objects/budget-id'
import { AllocationId } from '../value-objects/allocation-id'
import { AlertLevel, getAlertLevel } from '../enums/alert-level'
import { Decimal } from '@prisma/client/runtime/library'

export interface BudgetAlertProps {
  id: AlertId
  budgetId: BudgetId
  allocationId: AllocationId | null
  level: AlertLevel
  threshold: Decimal
  currentSpent: Decimal
  allocatedAmount: Decimal
  message: string
  isRead: boolean
  notifiedAt: Date | null
  createdAt: Date
}

export interface CreateBudgetAlertData {
  budgetId: string
  allocationId?: string
  currentSpent: number | string | Decimal
  allocatedAmount: number | string | Decimal
  customMessage?: string
}

export class BudgetAlert {
  private constructor(private props: BudgetAlertProps) {}

  static create(data: CreateBudgetAlertData): BudgetAlert {
    const currentSpent = typeof data.currentSpent === 'number' || typeof data.currentSpent === 'string'
      ? new Decimal(data.currentSpent)
      : data.currentSpent

    const allocatedAmount = typeof data.allocatedAmount === 'number' || typeof data.allocatedAmount === 'string'
      ? new Decimal(data.allocatedAmount)
      : data.allocatedAmount

    if (allocatedAmount.isZero()) {
      throw new Error('Allocated amount cannot be zero')
    }

    const spentPercentage = currentSpent.div(allocatedAmount).mul(100).toNumber()

    // Only create alert if threshold is met
    if (spentPercentage < 50) {
      throw new Error('Alert threshold not met (minimum 50%)')
    }

    const level = getAlertLevel(spentPercentage)
    const threshold = new Decimal(spentPercentage.toFixed(2))

    const message = data.customMessage || BudgetAlert.generateMessage(
      level,
      currentSpent,
      allocatedAmount,
      spentPercentage
    )

    return new BudgetAlert({
      id: AlertId.create(),
      budgetId: BudgetId.fromString(data.budgetId),
      allocationId: data.allocationId ? AllocationId.fromString(data.allocationId) : null,
      level,
      threshold,
      currentSpent,
      allocatedAmount,
      message,
      isRead: false,
      notifiedAt: null,
      createdAt: new Date(),
    })
  }

  static fromPersistence(props: BudgetAlertProps): BudgetAlert {
    return new BudgetAlert(props)
  }

  private static generateMessage(
    level: AlertLevel,
    currentSpent: Decimal,
    allocatedAmount: Decimal,
    percentage: number
  ): string {
    const remaining = allocatedAmount.sub(currentSpent)
    const formattedSpent = currentSpent.toFixed(2)
    const formattedAllocated = allocatedAmount.toFixed(2)
    const formattedRemaining = remaining.toFixed(2)

    switch (level) {
      case AlertLevel.EXCEEDED:
        return `Budget exceeded! Spent ${formattedSpent} of ${formattedAllocated} allocated (${percentage.toFixed(1)}%). Over budget by ${Math.abs(parseFloat(formattedRemaining))}.`
      case AlertLevel.CRITICAL:
        return `Critical: ${percentage.toFixed(1)}% of budget spent (${formattedSpent}/${formattedAllocated}). Only ${formattedRemaining} remaining.`
      case AlertLevel.WARNING:
        return `Warning: ${percentage.toFixed(1)}% of budget spent (${formattedSpent}/${formattedAllocated}). ${formattedRemaining} remaining.`
      case AlertLevel.INFO:
        return `Notice: ${percentage.toFixed(1)}% of budget spent (${formattedSpent}/${formattedAllocated}). ${formattedRemaining} remaining.`
    }
  }

  // Getters
  getId(): AlertId {
    return this.props.id
  }

  getBudgetId(): BudgetId {
    return this.props.budgetId
  }

  getAllocationId(): AllocationId | null {
    return this.props.allocationId
  }

  getLevel(): AlertLevel {
    return this.props.level
  }

  getThreshold(): Decimal {
    return this.props.threshold
  }

  getCurrentSpent(): Decimal {
    return this.props.currentSpent
  }

  getAllocatedAmount(): Decimal {
    return this.props.allocatedAmount
  }

  getMessage(): string {
    return this.props.message
  }

  isRead(): boolean {
    return this.props.isRead
  }

  getNotifiedAt(): Date | null {
    return this.props.notifiedAt
  }

  getCreatedAt(): Date {
    return this.props.createdAt
  }

  // Business logic methods
  markAsRead(): void {
    this.props.isRead = true
  }

  markAsNotified(): void {
    if (this.props.notifiedAt) {
      throw new Error('Alert has already been notified')
    }
    this.props.notifiedAt = new Date()
  }

  hasBeenNotified(): boolean {
    return this.props.notifiedAt !== null
  }

  isCritical(): boolean {
    return this.props.level === AlertLevel.CRITICAL || this.props.level === AlertLevel.EXCEEDED
  }

  equals(other: BudgetAlert): boolean {
    return this.props.id.equals(other.props.id)
  }
}
