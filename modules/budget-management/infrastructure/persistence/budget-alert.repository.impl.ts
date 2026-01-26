import { PrismaClient } from '@prisma/client'
import { BudgetAlert } from '../../domain/entities/budget-alert.entity'
import { AlertId } from '../../domain/value-objects/alert-id'
import { BudgetId } from '../../domain/value-objects/budget-id'
import { AllocationId } from '../../domain/value-objects/allocation-id'
import { AlertLevel } from '../../domain/enums/alert-level'
import { IBudgetAlertRepository, BudgetAlertFilters } from '../../domain/repositories/budget-alert.repository'

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
    })
  }

  async findById(id: AlertId): Promise<BudgetAlert | null> {
    const row = await this.prisma.budgetAlert.findUnique({
      where: { id: id.getValue() },
    })

    if (!row) return null

    return this.toDomain(row)
  }

  async findByBudget(budgetId: BudgetId): Promise<BudgetAlert[]> {
    const rows = await this.prisma.budgetAlert.findMany({
      where: { budgetId: budgetId.getValue() },
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((row) => this.toDomain(row))
  }

  async findByAllocation(allocationId: AllocationId): Promise<BudgetAlert[]> {
    const rows = await this.prisma.budgetAlert.findMany({
      where: { allocationId: allocationId.getValue() },
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((row) => this.toDomain(row))
  }

  async findByFilters(filters: BudgetAlertFilters, workspaceId: string): Promise<BudgetAlert[]> {
    const where: any = {}

    if (filters.budgetId) {
      where.budgetId = filters.budgetId
    } else {
      // Filter by workspace if no specific budget
      where.budget = {
        workspaceId,
      }
    }

    if (filters.allocationId) {
      where.allocationId = filters.allocationId
    }

    if (filters.level) {
      where.level = filters.level
    }

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead
    }

    const rows = await this.prisma.budgetAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((row) => this.toDomain(row))
  }

  async findUnreadAlerts(workspaceId: string): Promise<BudgetAlert[]> {
    const rows = await this.prisma.budgetAlert.findMany({
      where: {
        isRead: false,
        budget: {
          workspaceId,
        },
      },
      orderBy: [{ level: 'desc' }, { createdAt: 'desc' }],
    })

    return rows.map((row) => this.toDomain(row))
  }

  async delete(id: AlertId): Promise<void> {
    await this.prisma.budgetAlert.delete({
      where: { id: id.getValue() },
    })
  }

  async deleteByBudget(budgetId: BudgetId): Promise<void> {
    await this.prisma.budgetAlert.deleteMany({
      where: { budgetId: budgetId.getValue() },
    })
  }

  private toDomain(row: any): BudgetAlert {
    return BudgetAlert.fromPersistence({
      id: AlertId.fromString(row.id),
      budgetId: BudgetId.fromString(row.budgetId),
      allocationId: row.allocationId ? AllocationId.fromString(row.allocationId) : null,
      level: row.level as AlertLevel,
      threshold: row.threshold,
      currentSpent: row.currentSpent,
      allocatedAmount: row.allocatedAmount,
      message: row.message,
      isRead: row.isRead,
      notifiedAt: row.notifiedAt,
      createdAt: row.createdAt,
    })
  }
}
