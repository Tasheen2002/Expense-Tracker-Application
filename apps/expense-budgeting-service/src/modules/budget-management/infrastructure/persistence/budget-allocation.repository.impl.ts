import { PrismaClient, Prisma } from '@prisma/client';
import { BudgetAllocation } from '../../domain/entities/budget-allocation.entity';
import { AllocationId } from '../../domain/value-objects/allocation-id';
import { BudgetId } from '../../domain/value-objects/budget-id';
import { BudgetAlert } from '../../domain/entities/budget-alert.entity';
import { IBudgetAllocationRepository } from '../../domain/repositories/budget-allocation.repository';
import { BudgetAllocationExceededError } from '../../domain/errors/budget.errors';
import { Decimal } from '@prisma/client/runtime/library';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

export class BudgetAllocationRepositoryImpl
  implements IBudgetAllocationRepository
{
  constructor(protected readonly prisma: PrismaClient) {}

  async saveWithBudgetValidation(
    allocation: BudgetAllocation,
    budgetTotalAmount: Decimal,
    excludeAllocationId?: string
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const otherAllocations = await tx.budgetAllocation.aggregate({
        where: {
          budgetId: allocation.budgetId.getValue(),
          ...(excludeAllocationId ? { id: { not: excludeAllocationId } } : {}),
        },
        _sum: { allocatedAmount: true },
      });

      const currentSum =
        otherAllocations._sum.allocatedAmount || new Decimal(0);
      const newSum = currentSum.add(allocation.allocatedAmount);

      if (newSum.greaterThan(budgetTotalAmount)) {
        throw new BudgetAllocationExceededError(
          allocation.budgetId.getValue(),
          budgetTotalAmount.toNumber(),
          newSum.toNumber()
        );
      }

      await tx.budgetAllocation.upsert({
        where: { id: allocation.id.getValue() },
        create: {
          id: allocation.id.getValue(),
          budgetId: allocation.budgetId.getValue(),
          categoryId: allocation.categoryId,
          allocatedAmount: allocation.allocatedAmount,
          spentAmount: allocation.spentAmount,
          description: allocation.description,
          createdAt: allocation.createdAt,
          updatedAt: allocation.updatedAt,
        },
        update: {
          categoryId: allocation.categoryId,
          allocatedAmount: allocation.allocatedAmount,
          spentAmount: allocation.spentAmount,
          description: allocation.description,
          updatedAt: allocation.updatedAt,
        },
      });
    });
  }

  async save(allocation: BudgetAllocation): Promise<void> {
    await this.prisma.budgetAllocation.upsert({
      where: { id: allocation.id.getValue() },
      create: {
        id: allocation.id.getValue(),
        budgetId: allocation.budgetId.getValue(),
        categoryId: allocation.categoryId,
        allocatedAmount: allocation.allocatedAmount,
        spentAmount: allocation.spentAmount,
        description: allocation.description,
        createdAt: allocation.createdAt,
        updatedAt: allocation.updatedAt,
      },
      update: {
        allocatedAmount: allocation.allocatedAmount,
        spentAmount: allocation.spentAmount,
        description: allocation.description,
        updatedAt: allocation.updatedAt,
      },
    });
  }

  async saveWithAlerts(
    allocation: BudgetAllocation,
    alerts: BudgetAlert[]
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Save Allocation
      await tx.budgetAllocation.upsert({
        where: { id: allocation.id.getValue() },
        create: {
          id: allocation.id.getValue(),
          budgetId: allocation.budgetId.getValue(),
          categoryId: allocation.categoryId,
          allocatedAmount: allocation.allocatedAmount,
          spentAmount: allocation.spentAmount,
          description: allocation.description,
          createdAt: allocation.createdAt,
          updatedAt: allocation.updatedAt,
        },
        update: {
          allocatedAmount: allocation.allocatedAmount,
          spentAmount: allocation.spentAmount,
          description: allocation.description,
          updatedAt: allocation.updatedAt,
        },
      });

      // 2. Save Alerts
      for (const alert of alerts) {
        await tx.budgetAlert.create({
          data: {
            id: alert.id.getValue(),
            budgetId: alert.budgetId.getValue(),
            allocationId: alert.allocationId?.getValue(),
            level: alert.level,
            threshold: alert.threshold,
            currentSpent: alert.currentSpent,
            allocatedAmount: alert.allocatedAmount,
            message: alert.message,
            isRead: alert.isRead,
            notifiedAt: alert.notifiedAt,
            createdAt: alert.createdAt,
          },
        });
      }
    });
  }

  async findById(id: AllocationId): Promise<BudgetAllocation | null> {
    const row = await this.prisma.budgetAllocation.findUnique({
      where: { id: id.getValue() },
    });

    if (!row) return null;

    return this.toDomain(row);
  }

  async findByBudget(
    budgetId: BudgetId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAllocation>> {
    const where: Prisma.BudgetAllocationWhereInput = {
      budgetId: budgetId.getValue(),
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.budgetAllocation,
      { where, orderBy: { createdAt: 'asc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async findByBudgetAndCategory(
    budgetId: BudgetId,
    categoryId: string
  ): Promise<BudgetAllocation | null> {
    const row = await this.prisma.budgetAllocation.findFirst({
      where: {
        budgetId: budgetId.getValue(),
        categoryId,
      },
    });

    if (!row) return null;

    return this.toDomain(row);
  }

  async getTotalAllocatedAmount(budgetId: BudgetId): Promise<Decimal> {
    const result = await this.prisma.budgetAllocation.aggregate({
      where: { budgetId: budgetId.getValue() },
      _sum: { allocatedAmount: true },
    });

    return result._sum.allocatedAmount || new Decimal(0);
  }

  async delete(id: AllocationId): Promise<void> {
    // Domain events for deletion are dispatched by the service layer:
    // the service calls allocation.markAsDeleted() + allocationRepository.save(allocation)
    // before invoking this method, so events are already dispatched via save().
    await this.prisma.budgetAllocation.delete({
      where: { id: id.getValue() },
    });
  }

  async deleteByBudget(budgetId: BudgetId): Promise<void> {
    await this.prisma.budgetAllocation.deleteMany({
      where: { budgetId: budgetId.getValue() },
    });
  }

  private toDomain(
    row: Prisma.BudgetAllocationGetPayload<object>
  ): BudgetAllocation {
    return BudgetAllocation.fromPersistence({
      id: AllocationId.fromString(row.id),
      budgetId: BudgetId.fromString(row.budgetId),
      categoryId: row.categoryId,
      allocatedAmount: row.allocatedAmount,
      spentAmount: row.spentAmount,
      description: row.description || null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
