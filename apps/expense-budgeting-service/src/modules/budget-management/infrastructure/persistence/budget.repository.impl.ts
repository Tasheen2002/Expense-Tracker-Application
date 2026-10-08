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
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { IEventBus } from '@core/domain/events/domain-event';
import { Decimal } from '@prisma/client/runtime/library';
import {
  BudgetAllocationExceededError,
  BudgetAlreadyExistsError,
  BudgetNotFoundError,
} from '../../domain/errors/budget.errors';

export class BudgetRepositoryImpl
  extends PrismaRepository<Budget>
  implements IBudgetRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  private rethrowNameConflict(error: unknown, budget: Budget): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new BudgetNotFoundError(budget.id.getValue(), budget.workspaceId);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      const fields = Array.isArray(target)
        ? target.map(String)
        : [String(target ?? '')];
      if (
        fields.some(
          (field) => field === 'name' || field.includes('budget_workspace_name')
        )
      ) {
        throw new BudgetAlreadyExistsError(budget.name, budget.workspaceId);
      }
    }
    throw error;
  }

  private async withNameConflict(
    budget: Budget,
    write: () => Promise<void>
  ): Promise<void> {
    try {
      await write();
    } catch (error) {
      this.rethrowNameConflict(error, budget);
    }
  }

  async create(budget: Budget): Promise<void> {
    const period = budget.period;

    await this.withNameConflict(budget, () =>
      this.runInTransaction(async (tx) => {
        await tx.budget.create({
          data: {
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
        });
        await this.dispatchEvents(budget, tx);
      })
    );
  }

  async save(budget: Budget): Promise<void> {
    const period = budget.period;
    await this.withNameConflict(budget, () =>
      this.runInTransaction(async (tx) => {
        await tx.budget.update({
          where: { id: budget.id.getValue(), workspaceId: budget.workspaceId },
          data: {
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
        await this.dispatchEvents(budget, tx);
      })
    );
  }

  async saveWithAllocationValidation(budget: Budget): Promise<void> {
    await this.withNameConflict(budget, () =>
      this.runInTransaction(async (tx) => {
        // 1. Lock the budget row exclusively to coordinate with saveWithBudgetValidation (fails closed)
        const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "budget_management"."budgets"
        WHERE id = ${budget.id.getValue()}::uuid AND workspace_id = ${budget.workspaceId}::uuid
        FOR UPDATE
      `;
        if (lockedRows.length === 0) {
          throw new BudgetNotFoundError(
            budget.id.getValue(),
            budget.workspaceId
          );
        }

        // 2. Aggregate current allocations under this exclusive lock
        const allocations = await tx.budgetAllocation.aggregate({
          where: {
            budgetId: budget.id.getValue(),
          },
          _sum: { allocatedAmount: true },
        });

        const currentAllocated =
          allocations._sum.allocatedAmount || new Decimal(0);

        // 3. Verify new budget total is not less than already-allocated amount
        if (budget.totalAmount.lt(currentAllocated)) {
          throw new BudgetAllocationExceededError(
            budget.id.getValue(),
            budget.totalAmount.toNumber(),
            currentAllocated.toNumber()
          );
        }

        const period = budget.period;

        await tx.budget.update({
          where: { id: budget.id.getValue(), workspaceId: budget.workspaceId },
          data: {
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
        await this.dispatchEvents(budget, tx);
      })
    );
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

  async findByIdInternalWithLock(id: BudgetId): Promise<Budget | null> {
    if (!PrismaUnitOfWork.isInTransaction()) {
      throw new Error('A transaction is required to hold the budget row lock');
    }
    const client = this.prisma;
    if (typeof (client as any).$queryRaw !== 'function') {
      throw new Error(
        'PrismaClient instance does not support $queryRaw. PostgreSQL connection or ambient transaction client is required for atomic FOR UPDATE row locking.'
      );
    }

    const rows = await (client as any).$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "budget_management"."budgets"
      WHERE id = ${id.getValue()}::uuid
      FOR UPDATE
    `;

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const row = await (client as any).budget.findUnique({
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
      (page) =>
        this.prisma.budget.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          ...page,
        }),
      () => this.prisma.budget.count({ where }),
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
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (filters.isActive) {
        if (filters.status && filters.status !== BudgetStatus.ACTIVE) {
          where.AND = [{ status: BudgetStatus.ACTIVE }];
        } else {
          where.status = BudgetStatus.ACTIVE;
        }
        where.startDate = { lte: today };
        where.endDate = { gte: today };
      } else {
        where.OR = [
          { status: { not: BudgetStatus.ACTIVE } },
          { endDate: { lt: today } },
          { startDate: { gt: today } },
        ];
      }
    }

    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.budget.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          ...page,
        }),
      () => this.prisma.budget.count({ where }),
      (record) => this.toDomain(record),
      options
    );
  }

  async findActiveBudgets(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Budget>> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const where: Prisma.BudgetWhereInput = {
      workspaceId,
      status: BudgetStatus.ACTIVE,
      startDate: { lte: today },
      endDate: { gte: today },
    };

    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.budget.findMany({
          where,
          orderBy: { startDate: 'desc' },
          ...page,
        }),
      () => this.prisma.budget.count({ where }),
      (record) => this.toDomain(record),
      options
    );
  }

  async findExpiredBudgets(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Budget>> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const where: Prisma.BudgetWhereInput = {
      workspaceId,
      status: { in: [BudgetStatus.ACTIVE, BudgetStatus.EXCEEDED] },
      endDate: { lt: today },
    };

    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.budget.findMany({
          where,
          orderBy: { endDate: 'asc' },
          ...page,
        }),
      () => this.prisma.budget.count({ where }),
      (record) => this.toDomain(record),
      options
    );
  }

  async delete(id: BudgetId, workspaceId: string): Promise<void> {
    // Domain events for deletion are dispatched by the service layer:
    // the service calls budget.markAsDeleted() + budgetRepository.save(budget)
    // before invoking this method, so events are already dispatched via save().
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
