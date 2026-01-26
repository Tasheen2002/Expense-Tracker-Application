import { PrismaClient } from '@prisma/client'
import { SpendingLimit } from '../../domain/entities/spending-limit.entity'
import { SpendingLimitId } from '../../domain/value-objects/spending-limit-id'
import { BudgetPeriodType } from '../../domain/enums/budget-period-type'
import { ISpendingLimitRepository, SpendingLimitFilters } from '../../domain/repositories/spending-limit.repository'

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
    })
  }

  async findById(id: SpendingLimitId, workspaceId: string): Promise<SpendingLimit | null> {
    const row = await this.prisma.spendingLimit.findFirst({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    })

    if (!row) return null

    return this.toDomain(row)
  }

  async findByWorkspace(workspaceId: string): Promise<SpendingLimit[]> {
    const rows = await this.prisma.spendingLimit.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((row) => this.toDomain(row))
  }

  async findByFilters(filters: SpendingLimitFilters): Promise<SpendingLimit[]> {
    const where: any = {
      workspaceId: filters.workspaceId,
    }

    if (filters.userId !== undefined) {
      where.userId = filters.userId
    }

    if (filters.categoryId !== undefined) {
      where.categoryId = filters.categoryId
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    if (filters.periodType) {
      where.periodType = filters.periodType
    }

    const rows = await this.prisma.spendingLimit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((row) => this.toDomain(row))
  }

  async findActiveByUser(workspaceId: string, userId: string): Promise<SpendingLimit[]> {
    const rows = await this.prisma.spendingLimit.findMany({
      where: {
        workspaceId,
        userId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((row) => this.toDomain(row))
  }

  async findActiveByCategory(workspaceId: string, categoryId: string): Promise<SpendingLimit[]> {
    const rows = await this.prisma.spendingLimit.findMany({
      where: {
        workspaceId,
        categoryId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((row) => this.toDomain(row))
  }

  async findApplicableLimits(
    workspaceId: string,
    userId?: string,
    categoryId?: string
  ): Promise<SpendingLimit[]> {
    const where: any = {
      workspaceId,
      isActive: true,
      OR: [
        // Workspace-wide limits (applies to everyone)
        { userId: null, categoryId: null },
      ],
    }

    // Add user-specific limits
    if (userId) {
      where.OR.push(
        // User-specific, any category
        { userId, categoryId: null },
      )

      if (categoryId) {
        // User + category specific
        where.OR.push({ userId, categoryId })
      }
    }

    // Add category-specific limits (any user)
    if (categoryId) {
      where.OR.push({ userId: null, categoryId })
    }

    const rows = await this.prisma.spendingLimit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((row) => this.toDomain(row))
  }

  async delete(id: SpendingLimitId, workspaceId: string): Promise<void> {
    await this.prisma.spendingLimit.delete({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    })
  }

  private toDomain(row: any): SpendingLimit {
    return SpendingLimit.fromPersistence({
      id: SpendingLimitId.fromString(row.id),
      workspaceId: row.workspaceId,
      userId: row.userId,
      categoryId: row.categoryId,
      limitAmount: row.limitAmount,
      currency: row.currency,
      periodType: row.periodType as BudgetPeriodType,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }
}
