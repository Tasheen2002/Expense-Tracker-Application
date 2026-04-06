import { PrismaClient, Prisma } from '@prisma/client';
import { Budget } from '../../domain/entities/budget.entity';
import { BudgetId } from '../../domain/value-objects/budget-id';
import { BudgetPeriod } from '../../domain/value-objects/budget-period';
import { BudgetStatus } from '../../domain/enums/budget-status';
import { BudgetPeriodType } from '../../domain/enums/budget-period-type';
import {
  IBudgetRepository,
  BudgetFilters,
} from '../../domain/repositories/budget.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';

export class BudgetRepositoryImpl
  extends PrismaRepository<Budget>
  implements IBudgetRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(budget: Budget): Promise<void> {
    const period = budget.period;

    await this.prisma.budget.upsert({
      where: { id: budget.id.getValue() },
      create: {
        id: budget.id.getValue(),
        workspaceId: budget.workspaceId,
        name: budget.name,
        description: budget.description,
        totalAmount: budget.totalAmount,
        currency: budget.currency,
        periodType: period.periodType,
        startDate: period.startDate,
        endDate: period.endDate,
        status: budget.status,
        createdBy: budget.createdBy,
        isRecurring: budget.isRecurring(),
        rolloverUnused: budget.shouldRolloverUnused(),
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
      },
      update: {
        name: budget.name,
        description: budget.description,
        totalAmount: budget.totalAmount,
        currency: budget.currency,
        periodType: period.periodType,
        startDate: period.startDate,
        endDate: period.endDate,
        status: budget.status,
        isRecurring: budget.isRecurring(),
        rolloverUnused: budget.shouldRolloverUnused(),
        updatedAt: budget.updatedAt,
      },
    });

    await this.dispatchEvents(budget);
  }

  async findById(id: BudgetId, workspaceId: string): Promise<Budget | null> {
    const row = await this.prisma.budget.findFirst({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });

    if (!row) return null;

    return this.toDomain(row);
  }

  async findByIdInternal(id: BudgetId): Promise<Budget | null> {
    const row = await this.prisma.budget.findUnique({
      where: { id: id.getValue() },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Budget>> {
    const where: Prisma.BudgetWhereInput = { workspaceId };

    return PrismaRepositoryHelper.paginate(
      this.prisma.budget,
      { where, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async findByFilters(
    filters: BudgetFilters,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Budget>> {
    const where: Prisma.BudgetWhereInput = {
      workspaceId: filters.workspaceId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }

    if (filters.currency) {
      where.currency = filters.currency;
    }

    if (filters.isActive !== undefined) {
      const now = new Date();
      if (filters.isActive) {
        where.status = BudgetStatus.ACTIVE;
        where.startDate = { lte: now };
        where.endDate = { gte: now };
      } else {
        where.OR = [
          { status: { not: BudgetStatus.ACTIVE } },
          { endDate: { lt: now } },
          { startDate: { gt: now } },
        ];
      }
    }

    return PrismaRepositoryHelper.paginate(
      this.prisma.budget,
      { where, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async findActiveBudgets(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Budget>> {
    const now = new Date();

    const where: Prisma.BudgetWhereInput = {
      workspaceId,
      status: BudgetStatus.ACTIVE,
      startDate: { lte: now },
      endDate: { gte: now },
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.budget,
      { where, orderBy: { startDate: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async findExpiredBudgets(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Budget>> {
    const now = new Date();

    const where: Prisma.BudgetWhereInput = {
      workspaceId,
      status: BudgetStatus.ACTIVE,
      endDate: { lt: now },
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.budget,
      { where, orderBy: { endDate: 'asc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async delete(id: BudgetId, workspaceId: string): Promise<void> {
    await this.prisma.budget.delete({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });
  }

  async exists(id: BudgetId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.budget.count({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });

    return count > 0;
  }

  async existsByName(name: string, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.budget.count({
      where: {
        name,
        workspaceId,
      },
    });

    return count > 0;
  }

  private toDomain(row: Prisma.BudgetGetPayload<object>): Budget {
    const period = BudgetPeriod.fromDates(
      row.startDate,
      row.endDate,
      row.periodType as BudgetPeriodType
    );

    return Budget.fromPersistence({
      id: BudgetId.fromString(row.id),
      workspaceId: row.workspaceId,
      name: row.name,
      description: row.description,
      totalAmount: row.totalAmount,
      currency: row.currency,
      period,
      status: row.status as BudgetStatus,
      createdBy: row.createdBy,
      isRecurring: row.isRecurring,
      rolloverUnused: row.rolloverUnused,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
