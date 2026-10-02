import { PrismaClient, Prisma } from '@prisma/client';
import { BudgetAlert } from '../../domain/entities/budget-alert.entity';
import { AlertId } from '../../domain/value-objects/alert-id';
import { BudgetId } from '../../domain/value-objects/budget-id';
import { AllocationId } from '../../domain/value-objects/allocation-id';
import { AlertLevel } from '../../domain/enums/alert-level';
import {
  IBudgetAlertRepository,
  BudgetAlertFilters,
} from '../../domain/repositories/budget-alert.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { AlertNotFoundError } from '../../domain/errors/budget.errors';

export class BudgetAlertRepositoryImpl
  implements IBudgetAlertRepository
{
  constructor(protected readonly prisma: PrismaClient) {}

  protected get client(): PrismaClient | Prisma.TransactionClient {
    return PrismaUnitOfWork.getClient(this.prisma);
  }

  async save(alert: BudgetAlert, workspaceId: string): Promise<void> {
    const result = await this.client.budgetAlert.updateMany({
      where: { id: alert.id.getValue(), budget: { workspaceId } },
      data: {
        isRead: alert.isRead,
        notifiedAt: alert.notifiedAt,
      },
    });
    if (result.count === 0) {
      throw new AlertNotFoundError(alert.id.getValue());
    }
  }

  async findById(id: AlertId, workspaceId: string): Promise<BudgetAlert | null> {
    const row = await this.client.budgetAlert.findFirst({
      where: { id: id.getValue(), budget: { workspaceId } },
    });

    if (!row) return null;

    return this.toDomain(row);
  }

  async findByBudget(
    budgetId: BudgetId,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAlert>> {
    const where: Prisma.BudgetAlertWhereInput = {
      budgetId: budgetId.getValue(),
      budget: { workspaceId },
    };

    return PrismaRepositoryHelper.paginate(
      (this.client as PrismaClient).budgetAlert,
      { where, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async findByAllocation(
    allocationId: AllocationId,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAlert>> {
    const where: Prisma.BudgetAlertWhereInput = {
      allocationId: allocationId.getValue(),
      budget: { workspaceId },
    };

    return PrismaRepositoryHelper.paginate(
      (this.client as PrismaClient).budgetAlert,
      { where, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async findByFilters(
    filters: BudgetAlertFilters,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAlert>> {
    const where: Prisma.BudgetAlertWhereInput = { budget: { workspaceId } };

    if (filters.budgetId) {
      where.budgetId = filters.budgetId;
    }

    if (filters.allocationId) {
      where.allocationId = filters.allocationId;
    }

    if (filters.level) {
      where.level = filters.level;
    }

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    return PrismaRepositoryHelper.paginate(
      (this.client as PrismaClient).budgetAlert,
      { where, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async findUnreadAlerts(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAlert>> {
    const where: Prisma.BudgetAlertWhereInput = {
      isRead: false,
      budget: {
        workspaceId,
      },
    };

    return PrismaRepositoryHelper.paginate(
      (this.client as PrismaClient).budgetAlert,
      { where, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async delete(id: AlertId, workspaceId: string): Promise<void> {
    await this.client.budgetAlert.deleteMany({
      where: { id: id.getValue(), budget: { workspaceId } },
    });
  }

  async deleteByBudget(budgetId: BudgetId, workspaceId: string): Promise<void> {
    await (this.client as any).budgetAlert.deleteMany({
      where: { budgetId: budgetId.getValue(), budget: { workspaceId } },
    });
  }

  private toDomain(row: Prisma.BudgetAlertGetPayload<object>): BudgetAlert {
    return BudgetAlert.fromPersistence({
      id: AlertId.fromString(row.id),
      budgetId: BudgetId.fromString(row.budgetId),
      allocationId: row.allocationId
        ? AllocationId.fromString(row.allocationId)
        : null,
      level: row.level as AlertLevel,
      threshold: row.threshold,
      currentSpent: row.currentSpent,
      allocatedAmount: row.allocatedAmount,
      message: row.message,
      isRead: row.isRead,
      notifiedAt: row.notifiedAt || null,
      createdAt: row.createdAt,
    });
  }
}
