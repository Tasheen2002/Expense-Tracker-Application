import { PrismaClient } from "@prisma/client";
import { BudgetAllocation } from "../../domain/entities/budget-allocation.entity";
import { AllocationId } from "../../domain/value-objects/allocation-id";
import { BudgetId } from "../../domain/value-objects/budget-id";
import { BudgetAlert } from "../../domain/entities/budget-alert.entity";
import { IBudgetAllocationRepository } from "../../domain/repositories/budget-allocation.repository";
import { Decimal } from "@prisma/client/runtime/library";

export class BudgetAllocationRepositoryImpl implements IBudgetAllocationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(allocation: BudgetAllocation): Promise<void> {
    await this.prisma.budgetAllocation.upsert({
      where: { id: allocation.getId().getValue() },
      create: {
        id: allocation.getId().getValue(),
        budgetId: allocation.getBudgetId().getValue(),
        categoryId: allocation.getCategoryId(),
        allocatedAmount: allocation.getAllocatedAmount(),
        spentAmount: allocation.getSpentAmount(),
        description: allocation.getDescription(),
        createdAt: allocation.getCreatedAt(),
        updatedAt: allocation.getUpdatedAt(),
      },
      update: {
        allocatedAmount: allocation.getAllocatedAmount(),
        spentAmount: allocation.getSpentAmount(),
        description: allocation.getDescription(),
        updatedAt: allocation.getUpdatedAt(),
      },
    });
  }

  async saveWithAlerts(
    allocation: BudgetAllocation,
    alerts: BudgetAlert[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Save Allocation
      await tx.budgetAllocation.upsert({
        where: { id: allocation.getId().getValue() },
        create: {
          id: allocation.getId().getValue(),
          budgetId: allocation.getBudgetId().getValue(),
          categoryId: allocation.getCategoryId(),
          allocatedAmount: allocation.getAllocatedAmount(),
          spentAmount: allocation.getSpentAmount(),
          description: allocation.getDescription(),
          createdAt: allocation.getCreatedAt(),
          updatedAt: allocation.getUpdatedAt(),
        },
        update: {
          allocatedAmount: allocation.getAllocatedAmount(),
          spentAmount: allocation.getSpentAmount(),
          description: allocation.getDescription(),
          updatedAt: allocation.getUpdatedAt(),
        },
      });

      // 2. Save Alerts
      for (const alert of alerts) {
        await tx.budgetAlert.create({
          data: {
            id: alert.getId().getValue(),
            budgetId: alert.getBudgetId().getValue(),
            allocationId: alert.getAllocationId()?.getValue(),
            level: alert.getLevel(),
            threshold: alert.getThreshold(),
            currentSpent: alert.getCurrentSpent(),
            allocatedAmount: alert.getAllocatedAmount(),
            message: alert.getMessage(),
            isRead: alert.isRead(),
            notifiedAt: alert.getNotifiedAt(),
            createdAt: alert.getCreatedAt(),
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

  async findByBudget(budgetId: BudgetId): Promise<BudgetAllocation[]> {
    const rows = await this.prisma.budgetAllocation.findMany({
      where: { budgetId: budgetId.getValue() },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async findByBudgetAndCategory(
    budgetId: BudgetId,
    categoryId: string,
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
    await this.prisma.budgetAllocation.delete({
      where: { id: id.getValue() },
    });
  }

  async deleteByBudget(budgetId: BudgetId): Promise<void> {
    await this.prisma.budgetAllocation.deleteMany({
      where: { budgetId: budgetId.getValue() },
    });
  }

  private toDomain(row: any): BudgetAllocation {
    return BudgetAllocation.fromPersistence({
      id: AllocationId.fromString(row.id),
      budgetId: BudgetId.fromString(row.budgetId),
      categoryId: row.categoryId,
      allocatedAmount: row.allocatedAmount,
      spentAmount: row.spentAmount,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
