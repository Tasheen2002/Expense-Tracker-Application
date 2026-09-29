import { PrismaClient, Prisma } from '@prisma/client';
import { BudgetAllocation } from '../../domain/entities/budget-allocation.entity';
import { AllocationId } from '../../domain/value-objects/allocation-id';
import { BudgetId } from '../../domain/value-objects/budget-id';
import { BudgetAlert } from '../../domain/entities/budget-alert.entity';
import { IBudgetAllocationRepository } from '../../domain/repositories/budget-allocation.repository';
import {
  BudgetAllocationExceededError,
  BudgetNotFoundError,
  AllocationNotFoundError,
  AllocationAlreadyExistsError,
  InvalidBudgetDataError,
} from '../../domain/errors/budget.errors';
import { Decimal } from '@prisma/client/runtime/library';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';

export class BudgetAllocationRepositoryImpl
  implements IBudgetAllocationRepository
{
  constructor(protected readonly prisma: PrismaClient) {}

  protected get client(): PrismaClient | Prisma.TransactionClient {
    return PrismaUnitOfWork.getClient(this.prisma);
  }

  async saveWithBudgetValidation(
    allocation: BudgetAllocation,
    excludeAllocationId?: string
  ): Promise<void> {
    const client = this.client;
    const validateAndSave = async (tx: any) => {
      // Row lock the parent budget to serialize concurrent allocation additions/updates
      // and read the authoritative budget total under this lock (fails closed if locking is unavailable or row missing)
      const rows = await tx.$queryRaw<{ id: string; workspace_id: string; total_amount: Decimal | string | number }[]>`
        SELECT id, workspace_id, total_amount FROM "budget_management"."budgets"
        WHERE id = ${allocation.budgetId.getValue()}::uuid
        FOR UPDATE
      `;
      if (!Array.isArray(rows) || rows.length === 0 || rows[0].total_amount === undefined) {
        throw new BudgetNotFoundError(allocation.budgetId.getValue());
      }
      const currentBudgetTotal = new Decimal(rows[0].total_amount);
      if (allocation.categoryId) {
        const category = await tx.category.findFirst({
          where: { id: allocation.categoryId, workspaceId: rows[0].workspace_id },
          select: { id: true },
        });
        if (!category) throw new InvalidBudgetDataError('Category does not belong to this workspace');
      }

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

      if (newSum.greaterThan(currentBudgetTotal)) {
        throw new BudgetAllocationExceededError(
          allocation.budgetId.getValue(),
          currentBudgetTotal.toNumber(),
          newSum.toNumber()
        );
      }

      if (excludeAllocationId) {
        const result = await tx.budgetAllocation.updateMany({
          where: { id: allocation.id.getValue(), budgetId: allocation.budgetId.getValue() },
          data: {
            allocatedAmount: allocation.allocatedAmount,
            description: allocation.description,
            updatedAt: allocation.updatedAt,
          },
        });
        if (result.count !== 1) throw new AllocationNotFoundError(allocation.id.getValue());
      } else {
        await tx.budgetAllocation.create({ data: {
          id: allocation.id.getValue(),
          budgetId: allocation.budgetId.getValue(),
          categoryId: allocation.categoryId,
          allocatedAmount: allocation.allocatedAmount,
          spentAmount: allocation.spentAmount,
          description: allocation.description,
          createdAt: allocation.createdAt,
          updatedAt: allocation.updatedAt,
        } });
      }
    };

    try {
      if (PrismaUnitOfWork.isTransactionClient(client)) {
        await validateAndSave(client);
      } else {
        await this.prisma.$transaction(async (tx) => {
          await validateAndSave(tx);
        });
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = error.meta?.target;
        const fields = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
        if (fields.some((field) => field === 'category_id' || field === 'categoryId' ||
            field.includes('budget_category_allocation'))) {
          throw new AllocationAlreadyExistsError(
            allocation.budgetId.getValue(), allocation.categoryId ?? 'uncategorized'
          );
        }
      }
      throw error;
    }
  }

  async save(allocation: BudgetAllocation): Promise<void> {
    const result = await (this.client as any).budgetAllocation.updateMany({
      where: { id: allocation.id.getValue(), budgetId: allocation.budgetId.getValue() },
      data: {
        description: allocation.description,
        updatedAt: allocation.updatedAt,
      },
    });
    if (result.count !== 1) throw new AllocationNotFoundError(allocation.id.getValue());
  }

  async saveWithAlerts(
    allocation: BudgetAllocation,
    alerts: BudgetAlert[]
  ): Promise<void> {
    const client = this.client;
    const saveOperation = async (tx: any) => {
      // 1. Save Allocation
      const result = await tx.budgetAllocation.updateMany({
        where: { id: allocation.id.getValue(), budgetId: allocation.budgetId.getValue() },
        data: {
          spentAmount: allocation.spentAmount,
          updatedAt: allocation.updatedAt,
        },
      });
      if (result.count !== 1) throw new AllocationNotFoundError(allocation.id.getValue());

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
    };

    if (PrismaUnitOfWork.isTransactionClient(client)) {
      await saveOperation(client);
    } else {
      await this.prisma.$transaction(async (tx) => {
        await saveOperation(tx);
      });
    }
  }

  async findById(id: AllocationId): Promise<BudgetAllocation | null> {
    const row = await (this.client as any).budgetAllocation.findUnique({
      where: { id: id.getValue() },
    });

    if (!row) return null;

    return this.toDomain(row);
  }

  async findByIdInWorkspace(
    id: AllocationId,
    workspaceId: string
  ): Promise<BudgetAllocation | null> {
    const row = await this.client.budgetAllocation.findFirst({
      where: { id: id.getValue(), budget: { workspaceId } },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByBudget(
    budgetId: BudgetId,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAllocation>> {
    const where: Prisma.BudgetAllocationWhereInput = {
      budgetId: budgetId.getValue(),
      budget: { workspaceId },
    };

    return PrismaRepositoryHelper.paginate(
      (this.client as PrismaClient).budgetAllocation,
      { where, orderBy: { createdAt: 'asc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async findByBudgetAndCategory(
    budgetId: BudgetId,
    workspaceId: string,
    categoryId: string
  ): Promise<BudgetAllocation | null> {
    const row = await (this.client as any).budgetAllocation.findFirst({
      where: {
        budgetId: budgetId.getValue(),
        budget: { workspaceId },
        categoryId,
      },
    });

    if (!row) return null;

    return this.toDomain(row);
  }

  async getTotalAllocatedAmount(budgetId: BudgetId): Promise<Decimal> {
    const result = await (this.client as any).budgetAllocation.aggregate({
      where: { budgetId: budgetId.getValue() },
      _sum: { allocatedAmount: true },
    });

    return result._sum.allocatedAmount || new Decimal(0);
  }

  async getTotalSpentAmount(budgetId: BudgetId): Promise<Decimal> {
    const result = await (this.client as any).budgetAllocation.aggregate({
      where: { budgetId: budgetId.getValue() },
      _sum: { spentAmount: true },
    });

    return result._sum.spentAmount || new Decimal(0);
  }

  async delete(id: AllocationId, workspaceId: string): Promise<void> {
    // The service records the deletion event on the parent budget in the same transaction.
    await this.client.budgetAllocation.delete({
      where: { id: id.getValue(), budget: { workspaceId } },
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
