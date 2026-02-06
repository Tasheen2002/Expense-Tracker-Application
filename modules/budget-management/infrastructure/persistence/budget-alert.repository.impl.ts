import { PrismaClient, Prisma } from "@prisma/client";
import { BudgetAlert } from "../../domain/entities/budget-alert.entity";
import { AlertId } from "../../domain/value-objects/alert-id";
import { BudgetId } from "../../domain/value-objects/budget-id";
import { AllocationId } from "../../domain/value-objects/allocation-id";
import { AlertLevel } from "../../domain/enums/alert-level";
import {
  IBudgetAlertRepository,
  BudgetAlertFilters,
} from "../../domain/repositories/budget-alert.repository";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

export class BudgetAlertRepositoryImpl implements IBudgetAlertRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(alert: BudgetAlert): Promise<void> {
    await this.prisma.budgetAlert.upsert({
      where: { id: alert.getId().getValue() },
      create: {
        id: alert.getId().getValue(),
        budgetId: alert.getBudgetId().getValue(),
        allocationId: alert.getAllocationId()?.getValue() || null,
        level: alert.getLevel(),
        threshold: alert.getThreshold(),
        currentSpent: alert.getCurrentSpent(),
        allocatedAmount: alert.getAllocatedAmount(),
        message: alert.getMessage(),
        isRead: alert.isRead(),
        notifiedAt: alert.getNotifiedAt(),
        createdAt: alert.getCreatedAt(),
      },
      update: {
        isRead: alert.isRead(),
        notifiedAt: alert.getNotifiedAt(),
      },
    });
  }

  async findById(id: AlertId): Promise<BudgetAlert | null> {
    const row = await this.prisma.budgetAlert.findUnique({
      where: { id: id.getValue() },
    });

    if (!row) return null;

    return this.toDomain(row);
  }

  async findByBudget(
    budgetId: BudgetId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetAlert>> {
    const where: Prisma.BudgetAlertWhereInput = {
      budgetId: budgetId.getValue(),
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.budgetAlert,
      { where, orderBy: { createdAt: "desc" } },
      (record) => this.toDomain(record),
      options,
    );
  }

  async findByAllocation(
    allocationId: AllocationId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetAlert>> {
    const where: Prisma.BudgetAlertWhereInput = {
      allocationId: allocationId.getValue(),
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.budgetAlert,
      { where, orderBy: { createdAt: "desc" } },
      (record) => this.toDomain(record),
      options,
    );
  }

  async findByFilters(
    filters: BudgetAlertFilters,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetAlert>> {
    const where: Prisma.BudgetAlertWhereInput = {};

    if (filters.budgetId) {
      where.budgetId = filters.budgetId;
    } else {
      // Filter by workspace if no specific budget
      where.budget = {
        workspaceId,
      };
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
      this.prisma.budgetAlert,
      { where, orderBy: { createdAt: "desc" } },
      (record) => this.toDomain(record),
      options,
    );
  }

  async findUnreadAlerts(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetAlert>> {
    const where: Prisma.BudgetAlertWhereInput = {
      isRead: false,
      budget: {
        workspaceId,
      },
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.budgetAlert,
      { where, orderBy: [{ level: "desc" }, { createdAt: "desc" }] },
      (record) => this.toDomain(record),
      options,
    );
  }

  async delete(id: AlertId): Promise<void> {
    await this.prisma.budgetAlert.delete({
      where: { id: id.getValue() },
    });
  }

  async deleteByBudget(budgetId: BudgetId): Promise<void> {
    await this.prisma.budgetAlert.deleteMany({
      where: { budgetId: budgetId.getValue() },
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
