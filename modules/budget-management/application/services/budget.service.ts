import {
  IBudgetRepository,
  BudgetFilters,
} from '../../domain/repositories/budget.repository';
import { IBudgetAllocationRepository } from '../../domain/repositories/budget-allocation.repository';
import { IBudgetAlertRepository } from '../../domain/repositories/budget-alert.repository';
import { Budget, BudgetDTO } from '../../domain/entities/budget.entity';
import { BudgetAllocation, BudgetAllocationDTO } from '../../domain/entities/budget-allocation.entity';
import { BudgetAlert, BudgetAlertDTO } from '../../domain/entities/budget-alert.entity';
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
  }): Promise<BudgetDTO> {
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

    return Budget.toDTO(budget);
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
  ): Promise<BudgetDTO> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    );

    if (!budget) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }

    if (budget.createdBy !== userId) {
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
        await this.allocationRepository.getTotalAllocatedAmount(budget.id);

      if (newTotal.lt(currentAllocated)) {
        throw new BudgetAllocationExceededError(
          budget.id.getValue(),
          newTotal.toNumber(),
          currentAllocated.toNumber()
        );
      }
      budget.updateTotalAmount(updates.totalAmount);
    }

    await this.budgetRepository.save(budget);

    return Budget.toDTO(budget);
  }

  async activateBudget(
    budgetId: string,
    workspaceId: string,
    userId: string
  ): Promise<BudgetDTO> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    );

    if (!budget) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }

    if (budget.createdBy !== userId) {
      throw new UnauthorizedBudgetAccessError('activate');
    }

    budget.activate();

    await this.budgetRepository.save(budget);

    return Budget.toDTO(budget);
  }

  async archiveBudget(
    budgetId: string,
    workspaceId: string,
    userId: string
  ): Promise<BudgetDTO> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    );

    if (!budget) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }

    if (budget.createdBy !== userId) {
      throw new UnauthorizedBudgetAccessError('archive');
    }

    budget.archive();

    await this.budgetRepository.save(budget);

    return Budget.toDTO(budget);
  }

  async deleteBudget(
    budgetId: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const budgetIdObj = BudgetId.fromString(budgetId);

    const budget = await this.budgetRepository.findById(
      budgetIdObj,
      workspaceId
    );
    if (!budget) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }

    if (budget.createdBy !== userId) {
      throw new UnauthorizedBudgetAccessError('delete');
    }

    // Emit the deleted domain event before removing the record
    budget.markAsDeleted();
    await this.budgetRepository.save(budget);

    // Delete budget (cascade will handle allocations and alerts)
    await this.budgetRepository.delete(budgetIdObj, workspaceId);
  }

  async getBudgetById(
    budgetId: string,
    workspaceId: string
  ): Promise<BudgetDTO | null> {
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    );
    return budget ? Budget.toDTO(budget) : null;
  }

  async getBudgetsByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetDTO>> {
    const result = await this.budgetRepository.findByWorkspace(workspaceId, options);
    return { ...result, items: result.items.map((b) => Budget.toDTO(b)) };
  }

  async getActiveBudgets(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetDTO>> {
    const result = await this.budgetRepository.findActiveBudgets(workspaceId, options);
    return { ...result, items: result.items.map((b) => Budget.toDTO(b)) };
  }

  async filterBudgets(
    filters: BudgetFilters,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetDTO>> {
    const result = await this.budgetRepository.findByFilters(filters, options);
    return { ...result, items: result.items.map((b) => Budget.toDTO(b)) };
  }

  // Allocation methods
  async addAllocation(params: {
    budgetId: string;
    workspaceId: string;
    userId: string;
    categoryId?: string;
    allocatedAmount: number | string;
    description?: string;
  }): Promise<BudgetAllocationDTO> {
    // Verify parent budget ownership first
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(params.budgetId),
      params.workspaceId
    );

    if (!budget) {
      throw new BudgetNotFoundError(params.budgetId, params.workspaceId);
    }

    if (budget.createdBy !== params.userId) {
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
      budget.totalAmount
    );

    return BudgetAllocation.toDTO(allocation);
  }

  async updateAllocation(
    allocationId: string,
    workspaceId: string, // Need workspaceID to look up budget securely
    userId: string,
    updates: {
      allocatedAmount?: number | string;
      description?: string | null;
    }
  ): Promise<BudgetAllocationDTO> {
    const allocation = await this.allocationRepository.findById(
      AllocationId.fromString(allocationId)
    );

    if (!allocation) {
      throw new AllocationNotFoundError(allocationId);
    }

    // Verify ownership via parent budget
    const budget = await this.budgetRepository.findById(
      allocation.budgetId,
      workspaceId
    );

    if (!budget) {
      throw new BudgetNotFoundError(
        allocation.budgetId.getValue(),
        workspaceId
      );
    }

    if (budget.createdBy !== userId) {
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
        budget.totalAmount,
        allocationId
      );
    } else {
      await this.allocationRepository.save(allocation);
    }

    return BudgetAllocation.toDTO(allocation);
  }

  async updateAllocationSpent(
    allocationId: string,
    spentAmount: number | string
  ): Promise<BudgetAllocationDTO> {
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

    // Load the parent budget to emit child-entity events on the aggregate root
    const budget = await this.budgetRepository.findByIdInternal(
      allocation.budgetId
    );

    if (budget) {
      // Emit alert_generated events on the Budget aggregate for each alert raised
      for (const alert of alerts) {
        budget.recordAlertGenerated(alert.id.getValue(), alert.level);
      }

      // If spending has reached or exceeded the allocated amount, mark the parent
      // budget as EXCEEDED so its status accurately reflects its state.
      if (allocation.isOverBudget() && budget.isActive()) {
        try {
          budget.markAsExceeded(allocation.spentAmount.toNumber());
        } catch {
          // Status transition may already be EXCEEDED; ignore duplicate transitions
        }
      }

      if (budget.domainEvents.length > 0) {
        await this.budgetRepository.save(budget);
      }
    }

    return BudgetAllocation.toDTO(allocation);
  }

  async deleteAllocation(
    allocationId: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const allocation = await this.allocationRepository.findById(
      AllocationId.fromString(allocationId)
    );

    if (!allocation) {
      throw new AllocationNotFoundError(allocationId);
    }

    // Check Auth
    const budget = await this.budgetRepository.findById(
      allocation.budgetId,
      workspaceId
    );
    if (budget && budget.createdBy !== userId) {
      throw new UnauthorizedBudgetAccessError('delete allocation in');
    }

    // Emit allocation_deleted on the parent Budget aggregate
    if (budget) {
      budget.recordAllocationDeleted(allocationId);
      await this.budgetRepository.save(budget);
    }

    await this.allocationRepository.delete(
      AllocationId.fromString(allocationId)
    );
  }

  async getAllocationsByBudget(
    budgetId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAllocationDTO>> {
    // Verify the budget belongs to the workspace before returning its allocations
    const budget = await this.budgetRepository.findById(
      BudgetId.fromString(budgetId),
      workspaceId
    );
    if (!budget) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }
    const result = await this.allocationRepository.findByBudget(
      BudgetId.fromString(budgetId),
      options
    );
    return { ...result, items: result.items.map((alloc) => BudgetAllocation.toDTO(alloc)) };
  }

  // Alert management
  async getUnreadAlerts(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAlertDTO>> {
    const result = await this.alertRepository.findUnreadAlerts(workspaceId, options);
    return { ...result, items: result.items.map((alert) => BudgetAlert.toDTO(alert)) };
  }

  async markAlertAsRead(alertId: string): Promise<BudgetAlertDTO> {
    const alert = await this.alertRepository.findById(
      AlertId.fromString(alertId)
    );

    if (!alert) {
      throw new AlertNotFoundError(alertId);
    }

    alert.markAsRead();

    await this.alertRepository.save(alert);

    return BudgetAlert.toDTO(alert);
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
