import { PrismaClient } from "@prisma/client";
import { ExpenseAllocation } from "../../domain/entities/expense-allocation.entity";
import { ExpenseAllocationRepository } from "../../domain/repositories/expense-allocation.repository";
import { WorkspaceId } from "../../../identity-workspace";
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';

export class ExpenseAllocationRepositoryImpl
  extends PrismaRepository<ExpenseAllocation>
  implements ExpenseAllocationRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(allocation: ExpenseAllocation): Promise<void> {
    await this.prisma.expenseAllocation.create({
      data: {
        id: allocation.getId().getValue(),
        workspaceId: allocation.getWorkspaceId().getValue(),
        expenseId: allocation.getExpenseId(),
        amount: allocation.getAmount().getValue(),
        percentage: allocation.getPercentage(),
        departmentId: allocation.getDepartmentId()?.getValue() || null,
        costCenterId: allocation.getCostCenterId()?.getValue() || null,
        projectId: allocation.getProjectId()?.getValue() || null,
        notes: allocation.getNotes(),
        createdBy: allocation.getCreatedBy().getValue(),
        createdAt: allocation.getCreatedAt(),
      },
    });

    await this.dispatchEvents(allocation);
  }

  async saveBatch(allocations: ExpenseAllocation[]): Promise<void> {
    await this.prisma.expenseAllocation.createMany({
      data: allocations.map((a) => ({
        id: a.getId().getValue(),
        workspaceId: a.getWorkspaceId().getValue(),
        expenseId: a.getExpenseId(),
        amount: a.getAmount().getValue(),
        percentage: a.getPercentage(),
        departmentId: a.getDepartmentId()?.getValue() || null,
        costCenterId: a.getCostCenterId()?.getValue() || null,
        projectId: a.getProjectId()?.getValue() || null,
        notes: a.getNotes(),
        createdBy: a.getCreatedBy().getValue(),
        createdAt: a.getCreatedAt(),
      })),
    });

    // Dispatch events for all allocations
    for (const allocation of allocations) {
      await this.dispatchEvents(allocation);
    }
  }

  async replaceAllocs(
    expenseId: string,
    workspaceId: WorkspaceId,
    newAllocations: ExpenseAllocation[],
  ): Promise<void> {
    // 1. Load existing allocations BEFORE the transaction so we can emit
    //    ExpenseAllocationDeletedEvent for each one that will be removed.
    const existingRecords = await this.prisma.expenseAllocation.findMany({
      where: {
        expenseId,
        workspaceId: workspaceId.getValue(),
      },
    });

    const existingAllocations = existingRecords.map((a) =>
      ExpenseAllocation.reconstitute({
        id: a.id,
        workspaceId: a.workspaceId,
        expenseId: a.expenseId,
        amount: a.amount,
        percentage: a.percentage,
        departmentId: a.departmentId,
        costCenterId: a.costCenterId,
        projectId: a.projectId,
        notes: a.notes,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
      })
    );

    // Mark every existing allocation as deleted so events are queued.
    for (const existing of existingAllocations) {
      existing.markAsDeleted();
    }

    // 2. Perform the database replace inside a transaction.
    await this.prisma.$transaction(async (tx) => {
      // Delete existing allocations
      await tx.expenseAllocation.deleteMany({
        where: {
          expenseId,
          workspaceId: workspaceId.getValue(),
        },
      });

      // Insert new allocations
      if (newAllocations.length > 0) {
        await tx.expenseAllocation.createMany({
          data: newAllocations.map((a) => ({
            id: a.getId().getValue(),
            workspaceId: a.getWorkspaceId().getValue(),
            expenseId: a.getExpenseId(),
            amount: a.getAmount().getValue(),
            percentage: a.getPercentage(),
            departmentId: a.getDepartmentId()?.getValue() || null,
            costCenterId: a.getCostCenterId()?.getValue() || null,
            projectId: a.getProjectId()?.getValue() || null,
            notes: a.getNotes(),
            createdBy: a.getCreatedBy().getValue(),
            createdAt: a.getCreatedAt(),
          })),
        });
      }
    });

    // 3. Dispatch deletion events for all removed allocations.
    for (const existing of existingAllocations) {
      await this.dispatchEvents(existing);
    }

    // 4. Dispatch creation events for all new allocations (already queued by
    //    ExpenseAllocation.create() via addDomainEvent).
    for (const allocation of newAllocations) {
      await this.dispatchEvents(allocation);
    }

    // 5. Emit a single aggregate-level replacement event.  We piggyback on
    //    the first new allocation if one exists; otherwise we use a
    //    reconstituted placeholder since the event only needs the expenseId
    //    and workspaceId which are not allocation-specific.
    if (newAllocations.length > 0) {
      // recordReplacement queues the event on the first new allocation.
      // We create a temporary carrier aggregate to keep the entity clean.
      const carrier = newAllocations[0];
      carrier.recordReplacement(
        expenseId,
        workspaceId.getValue(),
        newAllocations.length,
      );
      await this.dispatchEvents(carrier);
    } else if (existingAllocations.length > 0) {
      // All allocations were removed — emit the replacement event via the
      // first previously-existing allocation used as a carrier.
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
      ExpenseAllocation.reconstitute({
        id: a.id,
        workspaceId: a.workspaceId,
        expenseId: a.expenseId,
        amount: a.amount,
        percentage: a.percentage,
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
    // Load allocations first so we can emit a deletion event for each one.
    const records = await this.prisma.expenseAllocation.findMany({
      where: {
        expenseId,
        workspaceId: workspaceId.getValue(),
      },
    });

    const allocations = records.map((a) =>
      ExpenseAllocation.reconstitute({
        id: a.id,
        workspaceId: a.workspaceId,
        expenseId: a.expenseId,
        amount: a.amount,
        percentage: a.percentage,
        departmentId: a.departmentId,
        costCenterId: a.costCenterId,
        projectId: a.projectId,
        notes: a.notes,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
      })
    );

    // Mark each allocation as deleted to queue domain events.
    for (const allocation of allocations) {
      allocation.markAsDeleted();
    }

    // Persist the deletion.
    await this.prisma.expenseAllocation.deleteMany({
      where: {
        expenseId,
        workspaceId: workspaceId.getValue(),
      },
    });

    // Dispatch deletion events after the database operation succeeds.
    for (const allocation of allocations) {
      await this.dispatchEvents(allocation);
    }
  }
}
