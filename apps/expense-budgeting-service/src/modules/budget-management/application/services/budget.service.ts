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
import { BudgetStatus } from '../../domain/enums/budget-status';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { IUnitOfWork } from '@shared/application/ports/unit-of-work.port';
import { IBudgetSpendingReader } from '../ports/budget-spending-reader.port';
import { IWorkspaceAccountingLock } from '../ports/workspace-accounting-lock.port';

import {
  BudgetNotFoundError,
  BudgetAlreadyExistsError,
  AllocationNotFoundError,
  AlertNotFoundError,
  UnauthorizedBudgetAccessError,
} from '../../domain/errors/budget.errors';

export class BudgetService {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly allocationRepository: IBudgetAllocationRepository,
    private readonly alertRepository: IBudgetAlertRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly spendingReader?: IBudgetSpendingReader,
    private readonly accountingLock?: IWorkspaceAccountingLock
  ) {}

  // Call only inside unitOfWork.execute so the row lock covers the write.
  private async getOwnedBudgetForWrite(
    budgetId: string,
    workspaceId: string,
    userId: string,
    operation: string
  ): Promise<Budget> {
    const budget = await this.budgetRepository.findByIdInternalWithLock(
      BudgetId.fromString(budgetId)
    );
    if (!budget || budget.workspaceId !== workspaceId) {
      throw new BudgetNotFoundError(budgetId, workspaceId);
    }
    if (budget.createdBy !== userId) {
      throw new UnauthorizedBudgetAccessError(operation);
    }
    return budget;
  }

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

    if (await this.budgetRepository.existsByName(budget.name, budget.workspaceId)) {
      throw new BudgetAlreadyExistsError(budget.name, budget.workspaceId);
    }

    await this.budgetRepository.create(budget);

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
    return this.unitOfWork.execute(async () => {
      const budget = await this.getOwnedBudgetForWrite(budgetId, workspaceId, userId, 'update');
      if (updates.name !== undefined) {
        const previousName = budget.name;
        budget.updateName(updates.name);
        if (
          budget.name !== previousName &&
          await this.budgetRepository.existsByName(budget.name, workspaceId)
        ) {
          throw new BudgetAlreadyExistsError(budget.name, workspaceId);
        }
      }
      if (updates.description !== undefined) budget.updateDescription(updates.description);
      if (updates.totalAmount !== undefined) {
        budget.updateTotalAmount(updates.totalAmount);
        await this.budgetRepository.saveWithAllocationValidation(budget);
      } else {
        await this.budgetRepository.save(budget);
      }
      return Budget.toDTO(budget);
    });
  }

  async activateBudget(
    budgetId: string,
    workspaceId: string,
    userId: string
  ): Promise<BudgetDTO> {
    return this.unitOfWork.execute(async () => {
      await this.accountingLock?.acquire(workspaceId);
      const budget = await this.getOwnedBudgetForWrite(budgetId, workspaceId, userId, 'activate');
      budget.activate();
      await this.budgetRepository.save(budget);
      if (this.spendingReader) {
        await this.synchronizeBudgetAllocations(budget);
      }
      const current = await this.budgetRepository.findById(budget.id, workspaceId);
      return Budget.toDTO(current ?? budget);
    });
  }

  async archiveBudget(
    budgetId: string,
    workspaceId: string,
    userId: string
  ): Promise<BudgetDTO> {
    return this.unitOfWork.execute(async () => {
      const budget = await this.getOwnedBudgetForWrite(budgetId, workspaceId, userId, 'archive');
      budget.archive();
      await this.budgetRepository.save(budget);
      return Budget.toDTO(budget);
    });
  }

  async deleteBudget(
    budgetId: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const budgetIdObj = BudgetId.fromString(budgetId);
    await this.unitOfWork.execute(async () => {
      const budget = await this.getOwnedBudgetForWrite(budgetId, workspaceId, userId, 'delete');
      // Emit the deleted domain event before removing the record
      budget.markAsDeleted();
      await this.budgetRepository.save(budget);
      // Delete budget (cascade will handle allocations and alerts)
      await this.budgetRepository.delete(budgetIdObj, workspaceId);
    });
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

    return this.unitOfWork.execute(async () => {
      await this.accountingLock?.acquire(params.workspaceId);
      await this.allocationRepository.saveWithBudgetValidation(allocation);
      if (this.spendingReader && budget.status === BudgetStatus.ACTIVE) {
        return this.updateAllocationSpent(
          allocation.id.getValue(),
          await this.spendingReader.total(budget, allocation.categoryId)
        );
      }
      return BudgetAllocation.toDTO(allocation);
    });
  }

  async updateAllocation(
    allocationId: string,
    workspaceId: string, // Need workspaceID to look up budget securely
    userId: string,
    updates: {
      allocatedAmount?: number | string;
      description?: string | null;
    },
    budgetId?: string
  ): Promise<BudgetAllocationDTO> {
    const allocation = await this.allocationRepository.findByIdInWorkspace(
      AllocationId.fromString(allocationId), workspaceId
    );

    if (!allocation) {
      throw new AllocationNotFoundError(allocationId);
    }

    // If budgetId was specified in the route, verify allocation belongs to it
    if (budgetId && allocation.budgetId.getValue() !== budgetId) {
      throw new AllocationNotFoundError(allocationId);
    }

    // Verify ownership via parent budget in the specified workspace
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
    const id = AllocationId.fromString(allocationId);
    const allocation = await this.allocationRepository.findById(id);

    if (!allocation) {
      throw new AllocationNotFoundError(allocationId);
    }

    const executeAtomicUpdate = async () => {
      // Pessimistically lock and retrieve parent budget row first to serialize concurrent
      // spending updates across allocations under the same budget.
      const budget = await this.budgetRepository.findByIdInternalWithLock(
        allocation.budgetId
      );

      // Reload after acquiring the lock so threshold crossings are evaluated against
      // the last committed spending value, including concurrent updates.
      const currentAllocation = await this.allocationRepository.findById(id);
      if (!currentAllocation || !currentAllocation.budgetId.equals(allocation.budgetId)) {
        throw new AllocationNotFoundError(allocationId);
      }
      currentAllocation.updateSpentAmount(spentAmount);
      const alerts = currentAllocation.collectTriggeredAlerts();

      await this.allocationRepository.saveWithAlerts(currentAllocation, alerts);

      if (budget) {
        // Emit alert_generated events on the Budget aggregate for each alert raised
        for (const alert of alerts) {
          budget.recordAlertGenerated(alert.id.getValue(), alert.level);
        }

        // Check whether the total spending across all allocations has exceeded
        // the parent budget's total limit before marking the entire budget as EXCEEDED.
        const totalSpent = await this.allocationRepository.getTotalSpentAmount(
          currentAllocation.budgetId
        );
        if (totalSpent.greaterThan(budget.totalAmount) && budget.isActive()) {
          budget.markAsExceeded(totalSpent.toNumber());
        }

        if (budget.domainEvents.length > 0 || budget.isExceeded()) {
          await this.budgetRepository.save(budget);
        }
      }
      return currentAllocation;
    };

    const updatedAllocation = await this.unitOfWork.execute(executeAtomicUpdate);

    return BudgetAllocation.toDTO(updatedAllocation);
  }

  async deleteAllocation(
    allocationId: string,
    workspaceId: string,
    userId: string,
    budgetId?: string
  ): Promise<void> {
    const allocation = await this.allocationRepository.findByIdInWorkspace(
      AllocationId.fromString(allocationId), workspaceId
    );

    if (!allocation) {
      throw new AllocationNotFoundError(allocationId);
    }

    // If budgetId was specified in the route, verify allocation belongs to it
    if (budgetId && allocation.budgetId.getValue() !== budgetId) {
      throw new AllocationNotFoundError(allocationId);
    }

    const executeDelete = async () => {
      const budget = await this.getOwnedBudgetForWrite(
        allocation.budgetId.getValue(), workspaceId, userId, 'delete allocation in'
      );
      const currentAllocation = await this.allocationRepository.findByIdInWorkspace(
        AllocationId.fromString(allocationId), workspaceId
      );
      if (!currentAllocation || !currentAllocation.budgetId.equals(allocation.budgetId)) {
        throw new AllocationNotFoundError(allocationId);
      }
      // Emit allocation_deleted on the parent Budget aggregate
      budget.recordAllocationDeleted(allocationId);
      await this.budgetRepository.save(budget);

      await this.allocationRepository.delete(
        AllocationId.fromString(allocationId),
        workspaceId
      );
    };

    await this.unitOfWork.execute(executeDelete);
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
      workspaceId,
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

  async markAlertAsRead(alertId: string, workspaceId: string): Promise<BudgetAlertDTO> {
    const alert = await this.alertRepository.findById(
      AlertId.fromString(alertId),
      workspaceId
    );

    if (!alert) {
      throw new AlertNotFoundError(alertId);
    }

    alert.markAsRead();

    await this.alertRepository.save(alert, workspaceId);

    return BudgetAlert.toDTO(alert);
  }

  // Budget period management
  async processExpiredBudgets(workspaceId: string): Promise<number> {
    let totalProcessed = 0;
    const batchSize = 50;

    while (totalProcessed < 500) {
      const result = await this.budgetRepository.findExpiredBudgets(workspaceId, {
        limit: batchSize,
        offset: 0,
      });

      if (!result.items || result.items.length === 0) {
        break;
      }

      for (const budget of result.items) {
        const archived = await this.unitOfWork.execute(async () => {
          await this.accountingLock?.acquire(workspaceId);
          const current = await this.budgetRepository.findByIdInternalWithLock(budget.id);
          if (!current || current.workspaceId !== workspaceId ||
              ![BudgetStatus.ACTIVE, BudgetStatus.EXCEEDED].includes(current.status) || !current.hasExpired()) {
            return false;
          }
          if (current.isRecurring()) {
            await this.createNextPeriod(current);
          }
          current.archive();
          await this.budgetRepository.save(current);
          return true;
        });
        if (archived) totalProcessed += 1;
      }

      if (result.items.length < batchSize) {
        break;
      }
    }

    return totalProcessed;
  }

  /** Corrects previously persisted totals from the approved-expense source of truth. */
  async reconcileActiveSpending(workspaceId: string): Promise<number> {
    if (!this.spendingReader || !this.accountingLock) return 0;
    let offset = 0;
    let reconciled = 0;
    while (true) {
      const page = await this.budgetRepository.findByWorkspace(workspaceId, {
        limit: 100, offset,
      });
      for (const budget of page.items) {
        if (![BudgetStatus.ACTIVE, BudgetStatus.EXCEEDED].includes(budget.status)) continue;
        await this.unitOfWork.execute(async () => {
          await this.accountingLock!.acquire(workspaceId);
          const current = await this.budgetRepository.findByIdInternalWithLock(budget.id);
          if (!current || current.workspaceId !== workspaceId ||
              ![BudgetStatus.ACTIVE, BudgetStatus.EXCEEDED].includes(current.status)) return;
          await this.synchronizeBudgetAllocations(current);
          reconciled += 1;
        });
      }
      offset += page.items.length;
      if (page.items.length < 100) break;
    }
    return reconciled;
  }

  private async createNextPeriod(current: Budget): Promise<void> {
    const nextStart = current.period.endDate;
    nextStart.setUTCDate(nextStart.getUTCDate() + 1);
    const suffix = ` (${nextStart.toISOString().slice(0, 10)})`;
    const base = current.name.replace(/ \(\d{4}-\d{2}-\d{2}\)$/, '');
    const nextName = `${base.slice(0, 255 - suffix.length)}${suffix}`;
    const spent = await this.allocationRepository.getTotalSpentAmount(current.id);
    const unused = current.totalAmount.minus(spent);
    const total = current.totalAmount.plus(
      current.shouldRolloverUnused() && unused.isPositive() ? unused : 0
    );
    const next = Budget.create({
      workspaceId: current.workspaceId,
      name: nextName,
      description: current.description ?? undefined,
      totalAmount: total,
      currency: current.currency,
      periodType: current.period.periodType,
      startDate: nextStart,
      endDate: current.period.periodType === BudgetPeriodType.CUSTOM
        ? new Date(nextStart.getTime() + (current.period.getDurationInDays() - 1) * 86_400_000)
        : undefined,
      createdBy: current.createdBy,
      isRecurring: true,
      rolloverUnused: current.shouldRolloverUnused(),
    });
    next.activate();
    await this.budgetRepository.create(next);

    let offset = 0;
    while (true) {
      const page = await this.allocationRepository.findByBudget(
        current.id, current.workspaceId, { limit: 100, offset }
      );
      for (const previous of page.items) {
        const allocation = BudgetAllocation.create({
          budgetId: next.id.getValue(),
          categoryId: previous.categoryId ?? undefined,
          allocatedAmount: previous.allocatedAmount,
          description: previous.description ?? undefined,
        });
        await this.allocationRepository.saveWithBudgetValidation(allocation);
      }
      offset += page.items.length;
      if (page.items.length < 100) break;
    }
    await this.synchronizeBudgetAllocations(next);
  }

  private async synchronizeBudgetAllocations(budget: Budget): Promise<void> {
    if (!this.spendingReader) return;
    let offset = 0;
    while (true) {
      const page = await this.allocationRepository.findByBudget(
        budget.id, budget.workspaceId, { limit: 100, offset }
      );
      for (const allocation of page.items) {
        await this.updateAllocationSpent(
          allocation.id.getValue(),
          await this.spendingReader.total(budget, allocation.categoryId)
        );
      }
      offset += page.items.length;
      if (page.items.length < 100) break;
    }
  }
}
