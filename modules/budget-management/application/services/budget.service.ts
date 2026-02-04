import {
  IBudgetRepository,
  BudgetFilters,
} from "../../domain/repositories/budget.repository";
import { IBudgetAllocationRepository } from "../../domain/repositories/budget-allocation.repository";
import { IBudgetAlertRepository } from "../../domain/repositories/budget-alert.repository";
import { Budget } from "../../domain/entities/budget.entity";
import { BudgetAllocation } from "../../domain/entities/budget-allocation.entity";
import { BudgetAlert } from "../../domain/entities/budget-alert.entity";
import { BudgetId } from "../../domain/value-objects/budget-id";
import { AllocationId } from "../../domain/value-objects/allocation-id";
import { AlertId } from "../../domain/value-objects/alert-id";
import { BudgetPeriodType } from "../../domain/enums/budget-period-type";
import { Decimal } from "@prisma/client/runtime/library";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PaginationOptions } from "../../../../apps/api/src/shared/domain/interfaces/pagination-options.interface";

import {
  BudgetNotFoundError,
  BudgetAlreadyExistsError,
  AllocationNotFoundError,
  AlertNotFoundError,
  UnauthorizedBudgetAccessError,
} from "../../domain/errors/budget.errors";

import { BudgetAllocationExceededError } from "../../domain/errors/budget-allocation-exceeded.error";

export class BudgetService {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly allocationRepository: IBudgetAllocationRepository,
    private readonly alertRepository: IBudgetAlertRepository,
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
      params.workspaceId,
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
    },
  ): Promise<Budget> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId,
    );

    if (!budget) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }

    if (budget.getCreatedBy() !== userId) {
      throw new UnauthorizedBudgetAccessError("update");
    }

    if (updates.name) {
      budget.updateName(updates.name);
    }

    if (updates.description !== undefined) {
      budget.updateDescription(updates.description);
    }

    if (updates.totalAmount) {
      const newTotal = new Decimal(updates.totalAmount);
      const currentAllocated =
        await this.allocationRepository.getTotalAllocatedAmount(budget.getId());

      if (newTotal.lt(currentAllocated)) {
        throw new BudgetAllocationExceededError(
          budget.getId().getValue(),
          newTotal.toNumber(),
          currentAllocated.toNumber(),
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
    userId: string,
  ): Promise<Budget> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId,
    );

    if (!budget) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }

    if (budget.getCreatedBy() !== userId) {
      throw new UnauthorizedBudgetAccessError("activate");
    }

    budget.activate();

    await this.budgetRepository.save(budget);

    return budget;
  }

  async archiveBudget(
    budgetId: string,
    workspaceId: string,
    userId: string,
  ): Promise<Budget> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId,
    );

    if (!budget) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }

    if (budget.getCreatedBy() !== userId) {
      throw new UnauthorizedBudgetAccessError("archive");
    }

    budget.archive();

    await this.budgetRepository.save(budget);

    return budget;
  }

  async deleteBudget(
    budgetId: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const budgetIdObj = BudgetId.fromString(budgetId);

    const exists = await this.budgetRepository.exists(budgetIdObj, workspaceId);
    if (!exists) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }

    const budget = await this.budgetRepository.findById(
      budgetIdObj,
      workspaceId,
    );
    if (budget && budget.getCreatedBy() !== userId) {
      throw new UnauthorizedBudgetAccessError("delete");
    }

    // Delete budget (cascade will handle allocations and alerts)
    await this.budgetRepository.delete(budgetIdObj, workspaceId);
  }

  async getBudgetById(
    budgetId: string,
    workspaceId: string,
  ): Promise<Budget | null> {
    return await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId,
    );
  }

  async getBudgetsByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Budget>> {
    return await this.budgetRepository.findByWorkspace(workspaceId, options);
  }

  async getActiveBudgets(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Budget>> {
    return await this.budgetRepository.findActiveBudgets(workspaceId, options);
  }

  async filterBudgets(
    filters: BudgetFilters,
    options?: PaginationOptions,
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
      params.workspaceId,
    );

    if (!budget) {
      throw new BudgetNotFoundError(params.budgetId, params.workspaceId);
    }

    if (budget.getCreatedBy() !== params.userId) {
      throw new UnauthorizedBudgetAccessError("add allocation to");
    }

    // Validate budget limits
    const currentAllocated =
      await this.allocationRepository.getTotalAllocatedAmount(budget.getId());
    const newAmount = new Decimal(params.allocatedAmount);

    // Delegate validation to the aggregate root
    budget.validateAllocationAmount(newAmount, currentAllocated);

    const allocation = BudgetAllocation.create({
      budgetId: params.budgetId,
      categoryId: params.categoryId,
      allocatedAmount: params.allocatedAmount,
      description: params.description,
    });

    await this.allocationRepository.save(allocation);

    return allocation;
  }

  async updateAllocation(
    allocationId: string,
    workspaceId: string, // Need workspaceID to look up budget securely
    userId: string,
    updates: {
      allocatedAmount?: number | string;
      description?: string | null;
    },
  ): Promise<BudgetAllocation> {
    const allocation = await this.allocationRepository.findById(
      AllocationId.fromString(allocationId),
    );

    if (!allocation) {
      throw new AllocationNotFoundError(allocationId);
    }

    // Verify ownership via parent budget
    const budget = await this.budgetRepository.findById(
      allocation.getBudgetId(),
      workspaceId,
    );

    if (!budget) {
      throw new BudgetNotFoundError(
        allocation.getBudgetId().getValue(),
        workspaceId,
      );
    }

    if (budget.getCreatedBy() !== userId) {
      throw new UnauthorizedBudgetAccessError("update allocation in");
    }

    if (updates.allocatedAmount) {
      const newAmount = new Decimal(updates.allocatedAmount);
      const currentAllocated =
        await this.allocationRepository.getTotalAllocatedAmount(budget.getId());
      const oldAmount = allocation.getAllocatedAmount(); // This is a Decimal

      // Calculate projected total BEFORE this specific allocation was made
      // effectively backing out the old amount to validate the new amount against the remaining pool
      const currentAllocatedWithoutThis = currentAllocated.minus(oldAmount);

      // Delegate validation to the aggregate root
      budget.validateAllocationAmount(newAmount, currentAllocatedWithoutThis);

      allocation.updateAllocatedAmount(updates.allocatedAmount);
    }

    if (updates.description !== undefined) {
      allocation.updateDescription(updates.description);
    }

    await this.allocationRepository.save(allocation);

    return allocation;
  }

  async updateAllocationSpent(
    allocationId: string,
    spentAmount: number | string,
  ): Promise<BudgetAllocation> {
    const allocation = await this.allocationRepository.findById(
      AllocationId.fromString(allocationId),
    );

    if (!allocation) {
      throw new AllocationNotFoundError(allocationId);
    }

    allocation.updateSpentAmount(spentAmount);

    // Check if we need to create alerts
    const alerts = await this.checkAndCreateAlerts(allocation);

    await this.allocationRepository.saveWithAlerts(allocation, alerts);

    return allocation;
  }

  async deleteAllocation(
    allocationId: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const allocation = await this.allocationRepository.findById(
      AllocationId.fromString(allocationId), // Assuming we need to fetch to check auth
    );

    if (!allocation) {
      // Idempotent success or throw not found
      return;
    }

    // Check Auth
    const budget = await this.budgetRepository.findById(
      allocation.getBudgetId(),
      workspaceId,
    );
    if (budget && budget.getCreatedBy() !== userId) {
      throw new UnauthorizedBudgetAccessError("delete allocation in");
    }

    await this.allocationRepository.delete(
      AllocationId.fromString(allocationId),
    );
  }

  async getAllocationsByBudget(budgetId: string): Promise<BudgetAllocation[]> {
    return await this.allocationRepository.findByBudget(
      BudgetId.fromString(budgetId),
    );
  }

  // Alert management
  private async checkAndCreateAlerts(
    allocation: BudgetAllocation,
  ): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];
    const percentage = allocation.getSpentPercentage();

    // Only create alerts if threshold is met (50%, 75%, 90%, 100%+)
    if (percentage >= 50) {
      try {
        const alert = BudgetAlert.create({
          budgetId: allocation.getBudgetId().getValue(),
          allocationId: allocation.getId().getValue(),
          currentSpent: allocation.getSpentAmount(),
          allocatedAmount: allocation.getAllocatedAmount(),
        });

        alerts.push(alert);
      } catch (error) {
        // Log the error instead of silently swallowing it
        // Duplicate alerts (constraint violations) are expected and can be ignored
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          !errorMessage.includes("duplicate") &&
          !errorMessage.includes("unique")
        ) {
          console.error(
            `[BudgetService] Failed to create alert for allocation ${allocation.getId().getValue()}: ${errorMessage}`,
          );
        }
      }
    }
    return alerts;
  }

  async getUnreadAlerts(workspaceId: string): Promise<BudgetAlert[]> {
    return await this.alertRepository.findUnreadAlerts(workspaceId);
  }

  async markAlertAsRead(alertId: string): Promise<BudgetAlert> {
    const alert = await this.alertRepository.findById(
      AlertId.fromString(alertId),
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
    const expiredBudgets =
      await this.budgetRepository.findExpiredBudgets(workspaceId);

    for (const budget of expiredBudgets) {
      budget.archive();
      await this.budgetRepository.save(budget);
    }

    return expiredBudgets.length;
  }
}
