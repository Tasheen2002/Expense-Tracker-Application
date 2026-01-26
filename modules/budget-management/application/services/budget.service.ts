import { IBudgetRepository, BudgetFilters } from '../../domain/repositories/budget.repository'
import { IBudgetAllocationRepository } from '../../domain/repositories/budget-allocation.repository'
import { IBudgetAlertRepository } from '../../domain/repositories/budget-alert.repository'
import { Budget } from '../../domain/entities/budget.entity'
import { BudgetAllocation } from '../../domain/entities/budget-allocation.entity'
import { BudgetAlert } from '../../domain/entities/budget-alert.entity'
import { BudgetId } from '../../domain/value-objects/budget-id'
import { AllocationId } from '../../domain/value-objects/allocation-id'
import { BudgetStatus } from '../../domain/enums/budget-status'
import { BudgetPeriodType } from '../../domain/enums/budget-period-type'
import { Decimal } from '@prisma/client/runtime/library'

export class BudgetService {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly allocationRepository: IBudgetAllocationRepository,
    private readonly alertRepository: IBudgetAlertRepository
  ) {}

  async createBudget(params: {
    workspaceId: string
    name: string
    description?: string
    totalAmount: number | string
    currency: string
    periodType: BudgetPeriodType
    startDate: Date
    endDate?: Date
    createdBy: string
    isRecurring?: boolean
    rolloverUnused?: boolean
  }): Promise<Budget> {
    const budget = Budget.create({
      workspaceId: params.workspaceId,
      name: params.name,
      description: params.description,
      totalAmount: params.totalAmount,
      currency: params.currency,
      periodType: params.periodType,
      startDate: params.startDate,
      endDate: params.endDate,
      createdBy: params.createdBy,
      isRecurring: params.isRecurring,
      rolloverUnused: params.rolloverUnused,
    })

    await this.budgetRepository.save(budget)

    return budget
  }

  async updateBudget(
    budgetId: string,
    workspaceId: string,
    updates: {
      name?: string
      description?: string | null
      totalAmount?: number | string
    }
  ): Promise<Budget> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    )

    if (!budget) {
      throw new Error('Budget not found')
    }

    if (updates.name) {
      budget.updateName(updates.name)
    }

    if (updates.description !== undefined) {
      budget.updateDescription(updates.description)
    }

    if (updates.totalAmount) {
      budget.updateTotalAmount(updates.totalAmount)
    }

    await this.budgetRepository.save(budget)

    return budget
  }

  async activateBudget(budgetId: string, workspaceId: string): Promise<Budget> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    )

    if (!budget) {
      throw new Error('Budget not found')
    }

    budget.activate()

    await this.budgetRepository.save(budget)

    return budget
  }

  async archiveBudget(budgetId: string, workspaceId: string): Promise<Budget> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    )

    if (!budget) {
      throw new Error('Budget not found')
    }

    budget.archive()

    await this.budgetRepository.save(budget)

    return budget
  }

  async deleteBudget(budgetId: string, workspaceId: string): Promise<void> {
    const budgetIdObj = BudgetId.fromString(budgetId)

    const exists = await this.budgetRepository.exists(budgetIdObj, workspaceId)
    if (!exists) {
      throw new Error('Budget not found')
    }

    // Delete associated allocations and alerts
    await this.allocationRepository.deleteByBudget(budgetIdObj)
    await this.alertRepository.deleteByBudget(budgetIdObj)

    await this.budgetRepository.delete(budgetIdObj, workspaceId)
  }

  async getBudgetById(budgetId: string, workspaceId: string): Promise<Budget | null> {
    return await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    )
  }

  async getBudgetsByWorkspace(workspaceId: string): Promise<Budget[]> {
    return await this.budgetRepository.findByWorkspace(workspaceId)
  }

  async getActiveBudgets(workspaceId: string): Promise<Budget[]> {
    return await this.budgetRepository.findActiveBudgets(workspaceId)
  }

  async filterBudgets(filters: BudgetFilters): Promise<Budget[]> {
    return await this.budgetRepository.findByFilters(filters)
  }

  // Allocation methods
  async addAllocation(params: {
    budgetId: string
    categoryId?: string
    allocatedAmount: number | string
    description?: string
  }): Promise<BudgetAllocation> {
    const allocation = BudgetAllocation.create({
      budgetId: params.budgetId,
      categoryId: params.categoryId,
      allocatedAmount: params.allocatedAmount,
      description: params.description,
    })

    await this.allocationRepository.save(allocation)

    return allocation
  }

  async updateAllocation(
    allocationId: string,
    updates: {
      allocatedAmount?: number | string
      description?: string | null
    }
  ): Promise<BudgetAllocation> {
    const allocation = await this.allocationRepository.findById(
      AllocationId.fromString(allocationId)
    )

    if (!allocation) {
      throw new Error('Allocation not found')
    }

    if (updates.allocatedAmount) {
      allocation.updateAllocatedAmount(updates.allocatedAmount)
    }

    if (updates.description !== undefined) {
      allocation.updateDescription(updates.description)
    }

    await this.allocationRepository.save(allocation)

    return allocation
  }

  async updateAllocationSpent(
    allocationId: string,
    spentAmount: number | string
  ): Promise<BudgetAllocation> {
    const allocation = await this.allocationRepository.findById(
      AllocationId.fromString(allocationId)
    )

    if (!allocation) {
      throw new Error('Allocation not found')
    }

    allocation.updateSpentAmount(spentAmount)

    // Check if we need to create alerts
    await this.checkAndCreateAlerts(allocation)

    await this.allocationRepository.save(allocation)

    return allocation
  }

  async deleteAllocation(allocationId: string): Promise<void> {
    await this.allocationRepository.delete(AllocationId.fromString(allocationId))
  }

  async getAllocationsByBudget(budgetId: string): Promise<BudgetAllocation[]> {
    return await this.allocationRepository.findByBudget(BudgetId.fromString(budgetId))
  }

  // Alert management
  private async checkAndCreateAlerts(allocation: BudgetAllocation): Promise<void> {
    const percentage = allocation.getSpentPercentage()

    // Only create alerts if threshold is met (50%, 75%, 90%, 100%+)
    if (percentage >= 50) {
      try {
        const alert = BudgetAlert.create({
          budgetId: allocation.getBudgetId().getValue(),
          allocationId: allocation.getId().getValue(),
          currentSpent: allocation.getSpentAmount(),
          allocatedAmount: allocation.getAllocatedAmount(),
        })

        await this.alertRepository.save(alert)
      } catch (error) {
        // Alert might already exist or threshold not met, that's okay
      }
    }
  }

  async getUnreadAlerts(workspaceId: string): Promise<BudgetAlert[]> {
    return await this.alertRepository.findUnreadAlerts(workspaceId)
  }

  async markAlertAsRead(alertId: string): Promise<BudgetAlert> {
    const alert = await this.alertRepository.findById(
      BudgetId.fromString(alertId) as any
    )

    if (!alert) {
      throw new Error('Alert not found')
    }

    alert.markAsRead()

    await this.alertRepository.save(alert)

    return alert
  }

  // Budget period management
  async processExpiredBudgets(workspaceId: string): Promise<number> {
    const expiredBudgets = await this.budgetRepository.findExpiredBudgets(workspaceId)

    for (const budget of expiredBudgets) {
      budget.archive()
      await this.budgetRepository.save(budget)
    }

    return expiredBudgets.length
  }
}
