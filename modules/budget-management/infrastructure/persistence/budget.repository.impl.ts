import { PrismaClient } from "@prisma/client";
import { Budget } from "../../domain/entities/budget.entity";
import { BudgetId } from "../../domain/value-objects/budget-id";
import { BudgetPeriod } from "../../domain/value-objects/budget-period";
import { BudgetStatus } from "../../domain/enums/budget-status";
import { BudgetPeriodType } from "../../domain/enums/budget-period-type";
import {
  IBudgetRepository,
  BudgetFilters,
} from "../../domain/repositories/budget.repository";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PaginationOptions } from "../../../../apps/api/src/shared/domain/interfaces/pagination-options.interface";

// ... (imports)
import { PrismaRepository } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";

export class BudgetRepositoryImpl
  extends PrismaRepository<Budget>
  implements IBudgetRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(budget: Budget): Promise<void> {
    const period = budget.getPeriod();

    await this.prisma.budget.upsert({
      where: { id: budget.getId().getValue() },
      create: {
        id: budget.getId().getValue(),
        workspaceId: budget.getWorkspaceId(),
        name: budget.getName(),
        description: budget.getDescription(),
        totalAmount: budget.getTotalAmount(),
        currency: budget.getCurrency(),
        periodType: period.getPeriodType(),
        startDate: period.getStartDate(),
        endDate: period.getEndDate(),
        status: budget.getStatus(),
        createdBy: budget.getCreatedBy(),
        isRecurring: budget.isRecurring(),
        rolloverUnused: budget.shouldRolloverUnused(),
        createdAt: budget.getCreatedAt(),
        updatedAt: budget.getUpdatedAt(),
      },
      update: {
        name: budget.getName(),
        description: budget.getDescription(),
        totalAmount: budget.getTotalAmount(),
        currency: budget.getCurrency(),
        periodType: period.getPeriodType(),
        startDate: period.getStartDate(),
        endDate: period.getEndDate(),
        status: budget.getStatus(),
        isRecurring: budget.isRecurring(),
        rolloverUnused: budget.shouldRolloverUnused(),
        updatedAt: budget.getUpdatedAt(),
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

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Budget>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [rows, total] = await Promise.all([
      this.prisma.budget.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.budget.count({ where: { workspaceId } }),
    ]);

    const items = rows.map((row) => this.toDomain(row));

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  async findByFilters(
    filters: BudgetFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Budget>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const where: any = {
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
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.budget.count({ where }),
    ]);

    const items = rows.map((row) => this.toDomain(row));

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  async findActiveBudgets(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Budget>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const now = new Date();

    const where = {
      workspaceId,
      status: BudgetStatus.ACTIVE,
      startDate: { lte: now },
      endDate: { gte: now },
    };

    const [rows, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        orderBy: { startDate: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.budget.count({ where }),
    ]);

    const items = rows.map((row) => this.toDomain(row));

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  async findExpiredBudgets(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Budget>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const now = new Date();

    const where = {
      workspaceId,
      status: BudgetStatus.ACTIVE,
      endDate: { lt: now },
    };

    const [rows, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        orderBy: { endDate: "asc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.budget.count({ where }),
    ]);

    const items = rows.map((row) => this.toDomain(row));

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
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

  private toDomain(row: any): Budget {
    const period = BudgetPeriod.fromDates(
      row.startDate,
      row.endDate,
      row.periodType as BudgetPeriodType,
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
