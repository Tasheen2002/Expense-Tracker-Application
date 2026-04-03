import {
  IBudgetRepository,
  BudgetFilters,
} from '../../domain/repositories/budget.repository';
import { IBudgetAllocationRepository } from '../../domain/repositories/budget-allocation.repository';
import { IBudgetAlertRepository } from '../../domain/repositories/budget-alert.repository';
import { Budget } from '../../domain/entities/budget.entity';
import { BudgetAllocation } from '../../domain/entities/budget-allocation.entity';
import { BudgetAlert } from '../../domain/entities/budget-alert.entity';
import { BudgetId } from '../../domain/value-objects/budget-id';
import { AllocationId } from '../../domain/value-objects/allocation-id';
import { AlertId } from '../../domain/value-objects/alert-id';
import { BudgetPeriodType } from '../../domain/enums/budget-period-type';
import { Decimal } from '@prisma/client/runtime/library';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

import {
  BudgetNotFoundError,
  BudgetAlreadyExistsError,
  AllocationNotFoundError,
  AlertNotFoundError,
  UnauthorizedBudgetAccessError,
} from '../../domain/errors/budget.errors';

import { BudgetAllocationExceededError } from '../../domain/errors/budget.errors';

export class BudgetService {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly allocationRepository: IBudgetAllocationRepository,
    private readonly alertRepository: IBudgetAlertRepository
  ) {}

  async createBudget(params: {
    workspaceId: string;
    name: string;
    description?: string;
    totalAmount: number | string;
    currency: string;
    periodType: BudgetPeriodType;
    startDate: Date;
    endDate?: Date;
    createdBy: string;
    isRecurring?: boolean;
    rolloverUnused?: boolean;
  }): Promise<Budget> {
    // Check for duplicate budget name in workspace
    const nameExists = await this.budgetRepository.existsByName(
      params.name,
      params.workspaceId
    );
    if (nameExists) {
      throw new BudgetAlreadyExistsError(params.name, params.workspaceId);
    }

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
    });

    await this.budgetRepository.save(budget);

    return budget;
  }

  async updateBudget(
    budgetId: string,
    workspaceId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string | null;
      totalAmount?: number | string;
    }
  ): Promise<Budget> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    );

    if (!budget) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }

    if (budget.getCreatedBy() !== userId) {
      throw new UnauthorizedBudgetAccessError('update');
    }

    if (updates.name) {
      budget.updateName(updates.name);
    }

    if (updates.description !== undefined) {
      budget.updateDescription(updates.description);
    }

    if (updates.totalAmount !== undefined) {
      const newTotal = new Decimal(updates.totalAmount);
      const currentAllocated =
        await this.allocationRepository.getTotalAllocatedAmount(budget.getId());

      if (newTotal.lt(currentAllocated)) {
        throw new BudgetAllocationExceededError(
          budget.getId().getValue(),
          newTotal.toNumber(),
          currentAllocated.toNumber()
        );
      }
      budget.updateTotalAmount(updates.totalAmount);
    }

    await this.budgetRepository.save(budget);

    return budget;
  }

  async activateBudget(
    budgetId: string,
    workspaceId: string,
    userId: string
  ): Promise<Budget> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    );

    if (!budget) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }

    if (budget.getCreatedBy() !== userId) {
      throw new UnauthorizedBudgetAccessError('activate');
    }

    budget.activate();

    await this.budgetRepository.save(budget);

    return budget;
  }

  async archiveBudget(
    budgetId: string,
    workspaceId: string,
    userId: string
  ): Promise<Budget> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    );

    if (!budget) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }

    if (budget.getCreatedBy() !== userId) {
      throw new UnauthorizedBudgetAccessError('archive');
    }

    budget.archive();

    await this.budgetRepository.save(budget);

    return budget;
  }

  async deleteBudget(
    budgetId: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const budgetIdObj = BudgetId.fromString(budgetId);

    const exists = await this.budgetRepository.exists(budgetIdObj, workspaceId);
    if (!exists) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }

    const budget = await this.budgetRepository.findById(
      budgetIdObj,
      workspaceId
    );
    if (budget && budget.getCreatedBy() !== userId) {
      throw new UnauthorizedBudgetAccessError('delete');
    }

    // Delete budget (cascade will handle allocations and alerts)
    await this.budgetRepository.delete(budgetIdObj, workspaceId);
  }

  async getBudgetById(
    budgetId: string,
    workspaceId: string
  ): Promise<Budget | null> {
    return await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    );
  }

  async getBudgetsByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Budget>> {
    return await this.budgetRepository.findByWorkspace(workspaceId, options);
  }

  async getActiveBudgets(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Budget>> {
    return await this.budgetRepository.findActiveBudgets(workspaceId, options);
  }

  async filterBudgets(
    filters: BudgetFilters,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Budget>> {
    return await this.budgetRepository.findByFilters(filters, options);
  }

  // Allocation methods
  async addAllocation(params: {
    budgetId: string;
    workspaceId: string;
    userId: string;
    categoryId?: string;
    allocatedAmount: number | string;
    description?: string;
  }): Promise<BudgetAllocation> {
    // Verify parent budget ownership first
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(params.budgetId),
      params.workspaceId
    );

    if (!budget) {
      throw new BudgetNotFoundError(params.budgetId, params.workspaceId);
    }

    if (budget.getCreatedBy() !== params.userId) {
      throw new UnauthorizedBudgetAccessError('add allocation to');
    }

    const allocation = BudgetAllocation.create({
      budgetId: params.budgetId,
      categoryId: params.categoryId,
      allocatedAmount: params.allocatedAmount,
      description: params.description,
    });

    // Use transactional validation to prevent TOCTOU race conditions
    await this.allocationRepository.saveWithBudgetValidation(
      allocation,
      budget.getTotalAmount()
    );

    return allocation;
  }

  async updateAllocation(
    allocationId: string,
    workspaceId: string, // Need workspaceID to look up budget securely
    userId: string,
    updates: {
      allocatedAmount?: number | string;
      description?: string | null;
    }
  ): Promise<BudgetAllocation> {
    const allocation = await this.allocationRepository.findById(
      AllocationId.fromString(allocationId)
    );

    if (!allocation) {
      throw new AllocationNotFoundError(allocationId);
    }

    // Verify ownership via parent budget
    const budget = await this.budgetRepository.findById(
      allocation.getBudgetId(),
      workspaceId
    );

    if (!budget) {
      throw new BudgetNotFoundError(
        allocation.getBudgetId().getValue(),
        workspaceId
      );
    }

    if (budget.getCreatedBy() !== userId) {
      throw new UnauthorizedBudgetAccessError('update allocation in');
    }

    if (updates.allocatedAmount !== undefined) {
      allocation.updateAllocatedAmount(updates.allocatedAmount);
    }

    if (updates.description !== undefined) {
      allocation.updateDescription(updates.description);
    }

    if (updates.allocatedAmount !== undefined) {
      // Use transactional validation to prevent TOCTOU race conditions
      // Exclude this allocation's old amount from the total check
      await this.allocationRepository.saveWithBudgetValidation(
        allocation,
        budget.getTotalAmount(),
        allocationId
      );
    } else {
      await this.allocationRepository.save(allocation);
    }

    return allocation;
  }

  async updateAllocationSpent(
    allocationId: string,
    spentAmount: number | string
  ): Promise<BudgetAllocation> {
    const allocation = await this.allocationRepository.findById(
      AllocationId.fromString(allocationId)
    );

    if (!allocation) {
      throw new AllocationNotFoundError(allocationId);
    }

    allocation.updateSpentAmount(spentAmount);

    // Alert creation is a domain decision: the entity knows its own thresholds
    const alerts = allocation.collectTriggeredAlerts();

    await this.allocationRepository.saveWithAlerts(allocation, alerts);

    // If spending has reached or exceeded the allocated amount, mark the parent
    // budget as EXCEEDED so its status accurately reflects its state.
    if (allocation.isOverBudget()) {
      const budget = await this.budgetRepository.findByIdInternal(
        allocation.getBudgetId()
      );
      if (budget && budget.isActive()) {
        try {
          budget.markAsExceeded(allocation.getSpentAmount().toNumber());
          await this.budgetRepository.save(budget);
        } catch {
          // Status transition may already be EXCEEDED; ignore duplicate transitions
        }
      }
    }

    return allocation;
  }

  async deleteAllocation(
    allocationId: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const allocation = await this.allocationRepository.findById(
      AllocationId.fromString(allocationId) // Assuming we need to fetch to check auth
    );

    if (!allocation) {
      throw new AllocationNotFoundError(allocationId);
    }

    // Check Auth
    const budget = await this.budgetRepository.findById(
      allocation.getBudgetId(),
      workspaceId
    );
    if (budget && budget.getCreatedBy() !== userId) {
      throw new UnauthorizedBudgetAccessError('delete allocation in');
    }

    await this.allocationRepository.delete(
      AllocationId.fromString(allocationId)
    );
  }

  async getAllocationsByBudget(
    budgetId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAllocation>> {
    // Verify the budget belongs to the workspace before returning its allocations
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    );
    if (!budget) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }
    return await this.allocationRepository.findByBudget(
      BudgetId.fromString(budgetId),
      options
    );
  }

  // Alert management
  async getUnreadAlerts(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAlert>> {
    return await this.alertRepository.findUnreadAlerts(workspaceId, options);
  }

  async markAlertAsRead(alertId: string): Promise<BudgetAlert> {
    const alert = await this.alertRepository.findById(
      AlertId.fromString(alertId)
    );

    if (!alert) {
      throw new AlertNotFoundError(alertId);
    }

    alert.markAsRead();

    await this.alertRepository.save(alert);

    return alert;
  }

  // Budget period management
  async processExpiredBudgets(workspaceId: string): Promise<number> {
    const result = await this.budgetRepository.findExpiredBudgets(workspaceId);

    for (const budget of result.items) {
      budget.archive();
      await this.budgetRepository.save(budget);
    }

    return result.items.length;
  }
}
