import { PrismaClient, Prisma } from "@prisma/client";
import { SpendingLimit } from "../../domain/entities/spending-limit.entity";
import { SpendingLimitId } from "../../domain/value-objects/spending-limit-id";
import { BudgetPeriodType } from "../../domain/enums/budget-period-type";
import {
  ISpendingLimitRepository,
  SpendingLimitFilters,
} from "../../domain/repositories/spending-limit.repository";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

export class SpendingLimitRepositoryImpl implements ISpendingLimitRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(limit: SpendingLimit): Promise<void> {
    await this.prisma.spendingLimit.upsert({
      where: { id: limit.getId().getValue() },
      create: {
        id: limit.getId().getValue(),
        workspaceId: limit.getWorkspaceId(),
        userId: limit.getUserId(),
        categoryId: limit.getCategoryId(),
        limitAmount: limit.getLimitAmount(),
        currency: limit.getCurrency(),
        periodType: limit.getPeriodType(),
        isActive: limit.isActive(),
        createdAt: limit.getCreatedAt(),
        updatedAt: limit.getUpdatedAt(),
      },
      update: {
        limitAmount: limit.getLimitAmount(),
        periodType: limit.getPeriodType(),
        isActive: limit.isActive(),
        updatedAt: limit.getUpdatedAt(),
      },
    });
  }

  async findById(
    id: SpendingLimitId,
    workspaceId: string,
  ): Promise<SpendingLimit | null> {
    const row = await this.prisma.spendingLimit.findFirst({
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
  ): Promise<PaginatedResult<SpendingLimit>> {
    const where: Prisma.SpendingLimitWhereInput = { workspaceId };

    return PrismaRepositoryHelper.paginate(
      this.prisma.spendingLimit,
      { where, orderBy: { createdAt: "desc" } },
      (record: Prisma.SpendingLimitGetPayload<object>) => this.toDomain(record),
      options,
    );
  }

  async findByFilters(
    filters: SpendingLimitFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SpendingLimit>> {
    const where: Prisma.SpendingLimitWhereInput = {
      workspaceId: filters.workspaceId,
    };

    if (filters.userId !== undefined) {
      where.userId = filters.userId;
    }

    if (filters.categoryId !== undefined) {
      where.categoryId = filters.categoryId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.periodType) {
      where.periodType = filters.periodType;
    }

    return PrismaRepositoryHelper.paginate(
      this.prisma.spendingLimit,
      { where, orderBy: { createdAt: "desc" } },
      (record: Prisma.SpendingLimitGetPayload<object>) => this.toDomain(record),
      options,
    );
  }

  async findActiveByUser(
    workspaceId: string,
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SpendingLimit>> {
    const where: Prisma.SpendingLimitWhereInput = {
      workspaceId,
      userId,
      isActive: true,
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.spendingLimit,
      { where, orderBy: { createdAt: "desc" } },
      (record: Prisma.SpendingLimitGetPayload<object>) => this.toDomain(record),
      options,
    );
  }

  async findActiveByCategory(
    workspaceId: string,
    categoryId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SpendingLimit>> {
    const where: Prisma.SpendingLimitWhereInput = {
      workspaceId,
      categoryId,
      isActive: true,
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.spendingLimit,
      { where, orderBy: { createdAt: "desc" } },
      (record: Prisma.SpendingLimitGetPayload<object>) => this.toDomain(record),
      options,
    );
  }

  async findApplicableLimits(
    workspaceId: string,
    userId?: string,
    categoryId?: string,
  ): Promise<SpendingLimit[]> {
    const orConditions: Prisma.SpendingLimitWhereInput[] = [
      // Workspace-wide limits (applies to everyone)
      { userId: null, categoryId: null },
    ];

    // Add user-specific limits
    if (userId) {
      orConditions.push(
        // User-specific, any category
        { userId, categoryId: null },
      );

      if (categoryId) {
        // User + category specific
        orConditions.push({ userId, categoryId });
      }
    }

    // Add category-specific limits (any user)
    if (categoryId) {
      orConditions.push({ userId: null, categoryId });
    }

    const where: Prisma.SpendingLimitWhereInput = {
      workspaceId,
      isActive: true,
      OR: orConditions,
    };

    const rows = await this.prisma.spendingLimit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return rows.map((row) => this.toDomain(row));
  }

  async delete(id: SpendingLimitId, workspaceId: string): Promise<void> {
    await this.prisma.spendingLimit.delete({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });
  }

  private toDomain(row: Prisma.SpendingLimitGetPayload<object>): SpendingLimit {
    return SpendingLimit.fromPersistence({
      id: SpendingLimitId.fromString(row.id),
      workspaceId: row.workspaceId,
      userId: row.userId || null,
      categoryId: row.categoryId || null,
      limitAmount: row.limitAmount,
      currency: row.currency,
      periodType: row.periodType as BudgetPeriodType,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
