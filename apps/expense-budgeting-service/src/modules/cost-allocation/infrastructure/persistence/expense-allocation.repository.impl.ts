import { PrismaClient } from "@prisma/client";
import { ExpenseAllocation } from "../../domain/entities/expense-allocation.entity";
import { IExpenseAllocationRepository } from "../../domain/repositories/expense-allocation.repository";
import {  WorkspaceId  } from '@core/domain/value-objects';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';
import { AllocationAmount } from "../../domain/value-objects/allocation-amount";

export class ExpenseAllocationRepositoryImpl
  extends PrismaRepository<ExpenseAllocation>
  implements IExpenseAllocationRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(allocation: ExpenseAllocation): Promise<void> {
    await this.prisma.expenseAllocation.create({
      data: {
        id: allocation.id.getValue(),
        workspaceId: allocation.workspaceId.getValue(),
        expenseId: allocation.expenseId,
        amount: allocation.amount.getValue(),
        percentage: allocation.percentage,
        departmentId: allocation.departmentId?.getValue() || null,
        costCenterId: allocation.costCenterId?.getValue() || null,
        projectId: allocation.projectId?.getValue() || null,
        notes: allocation.notes,
        createdBy: allocation.createdBy.getValue(),
        createdAt: allocation.createdAt,
      },
    });

    await this.dispatchEvents(allocation);
  }

  async saveBatch(allocations: ExpenseAllocation[]): Promise<void> {
    await this.prisma.expenseAllocation.createMany({
      data: allocations.map((a) => ({
        id: a.id.getValue(),
        workspaceId: a.workspaceId.getValue(),
        expenseId: a.expenseId,
        amount: a.amount.getValue(),
        percentage: a.percentage,
        departmentId: a.departmentId?.getValue() || null,
        costCenterId: a.costCenterId?.getValue() || null,
        projectId: a.projectId?.getValue() || null,
        notes: a.notes,
        createdBy: a.createdBy.getValue(),
        createdAt: a.createdAt,
      })),
    });

    for (const allocation of allocations) {
      await this.dispatchEvents(allocation);
    }
  }

  async replaceAllocs(
    expenseId: string,
    workspaceId: WorkspaceId,
    newAllocations: ExpenseAllocation[],
  ): Promise<void> {
    const existingRecords = await this.prisma.expenseAllocation.findMany({
      where: {
        expenseId,
        workspaceId: workspaceId.getValue(),
      },
    });

    const existingAllocations = existingRecords.map((a) =>
      ExpenseAllocation.fromPersistence({
        id: a.id,
        workspaceId: a.workspaceId,
        expenseId: a.expenseId,
        amount: AllocationAmount.create(a.amount),
        percentage: a.percentage !== null ? a.percentage.toNumber() : null,
        departmentId: a.departmentId,
        costCenterId: a.costCenterId,
        projectId: a.projectId,
        notes: a.notes,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
      })
    );

    for (const existing of existingAllocations) {
      existing.markAsDeleted();
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.expenseAllocation.deleteMany({
        where: {
          expenseId,
          workspaceId: workspaceId.getValue(),
        },
      });

      if (newAllocations.length > 0) {
        await tx.expenseAllocation.createMany({
          data: newAllocations.map((a) => ({
            id: a.id.getValue(),
            workspaceId: a.workspaceId.getValue(),
            expenseId: a.expenseId,
            amount: a.amount.getValue(),
            percentage: a.percentage,
            departmentId: a.departmentId?.getValue() || null,
            costCenterId: a.costCenterId?.getValue() || null,
            projectId: a.projectId?.getValue() || null,
            notes: a.notes,
            createdBy: a.createdBy.getValue(),
            createdAt: a.createdAt,
          })),
        });
      }
    });

    for (const existing of existingAllocations) {
      await this.dispatchEvents(existing);
    }

    for (const allocation of newAllocations) {
      await this.dispatchEvents(allocation);
    }

    if (newAllocations.length > 0) {
      const carrier = newAllocations[0];
      carrier.recordReplacement(expenseId, workspaceId.getValue(), newAllocations.length);
      await this.dispatchEvents(carrier);
    } else if (existingAllocations.length > 0) {
      const carrier = existingAllocations[0];
      carrier.recordReplacement(expenseId, workspaceId.getValue(), 0);
      await this.dispatchEvents(carrier);
    }
  }

  async findByExpenseId(
    expenseId: string,
    workspaceId: WorkspaceId,
  ): Promise<ExpenseAllocation[]> {
    const data = await this.prisma.expenseAllocation.findMany({
      where: {
        expenseId: expenseId,
        workspaceId: workspaceId.getValue(),
      },
    });

    return data.map((a) =>
      ExpenseAllocation.fromPersistence({
        id: a.id,
        workspaceId: a.workspaceId,
        expenseId: a.expenseId,
        amount: AllocationAmount.create(a.amount),
        percentage: a.percentage !== null ? a.percentage.toNumber() : null,
        departmentId: a.departmentId,
        costCenterId: a.costCenterId,
        projectId: a.projectId,
        notes: a.notes,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
      }),
    );
  }

  async deleteByExpenseId(
    expenseId: string,
    workspaceId: WorkspaceId,
  ): Promise<void> {
    const records = await this.prisma.expenseAllocation.findMany({
      where: {
        expenseId,
        workspaceId: workspaceId.getValue(),
      },
    });

    const allocations = records.map((a) =>
      ExpenseAllocation.fromPersistence({
        id: a.id,
        workspaceId: a.workspaceId,
        expenseId: a.expenseId,
        amount: AllocationAmount.create(a.amount),
        percentage: a.percentage !== null ? a.percentage.toNumber() : null,
        departmentId: a.departmentId,
        costCenterId: a.costCenterId,
        projectId: a.projectId,
        notes: a.notes,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
      })
    );

    for (const allocation of allocations) {
      allocation.markAsDeleted();
    }

    await this.prisma.expenseAllocation.deleteMany({
      where: {
        expenseId,
        workspaceId: workspaceId.getValue(),
      },
    });

    for (const allocation of allocations) {
      await this.dispatchEvents(allocation);
    }
  }
}
