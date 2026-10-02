import { PrismaClient } from "@prisma/client";
import { ExpenseAllocation } from "../../domain/entities/expense-allocation.entity";
import { IExpenseAllocationRepository } from "../../domain/repositories/expense-allocation.repository";
import {  WorkspaceId  } from '@core/domain/value-objects';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';
import { AllocationAmount } from "../../domain/value-objects/allocation-amount";
import { ExpenseNotFoundError, InvalidAllocationTargetError, InvalidTotalAllocationError } from "../../domain/errors/cost-allocation.errors";
import { Decimal } from "@prisma/client/runtime/library";

export class ExpenseAllocationRepositoryImpl
  extends PrismaRepository<ExpenseAllocation>
  implements IExpenseAllocationRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async replaceAllocs(
    expenseId: string,
    workspaceId: WorkspaceId,
    newAllocations: ExpenseAllocation[],
  ): Promise<void> {
    await this.runInTransaction(async (tx) => {
    const expenseRows = await tx.$queryRaw<Array<{ amount: Decimal }>>`
      SELECT amount FROM "expense_ledger"."expenses"
      WHERE id = ${expenseId}::uuid AND workspace_id = ${workspaceId.getValue()}::uuid
      FOR UPDATE
    `;
    if (expenseRows.length === 0) throw new ExpenseNotFoundError(expenseId);
    const total = newAllocations.reduce((sum, allocation) => sum.add(allocation.amount.getValue()), new Decimal(0));
    if (newAllocations.some((allocation) => allocation.expenseId !== expenseId || allocation.workspaceId.getValue() !== workspaceId.getValue())) {
      throw new InvalidAllocationTargetError('Allocation does not match the expense and workspace');
    }
    if (total.greaterThan(expenseRows[0].amount)) {
      throw new InvalidTotalAllocationError(total.toNumber(), expenseRows[0].amount.toNumber());
    }
    for (const allocation of newAllocations) {
      allocation.validatePercentageOf(expenseRows[0].amount.toString());
    }

    // Hold a shared row lock until commit so a target cannot be deactivated
    // between validation and insertion. A concurrent deactivation takes an
    // UPDATE lock and therefore waits for this replacement to finish.
    const targets = newAllocations.map((allocation) => ({
      departmentId: allocation.departmentId?.getValue(),
      costCenterId: allocation.costCenterId?.getValue(),
      projectId: allocation.projectId?.getValue(),
    }));
    const targetIds = [
      ...new Set(targets.flatMap((target) => target.departmentId ? [`department:${target.departmentId}`] : [])),
      ...new Set(targets.flatMap((target) => target.costCenterId ? [`costCenter:${target.costCenterId}`] : [])),
      ...new Set(targets.flatMap((target) => target.projectId ? [`project:${target.projectId}`] : [])),
    ].sort();

    for (const target of targetIds) {
      const [kind, id] = target.split(':');
      const rows = kind === 'department'
        ? await tx.$queryRaw<Array<{ isActive: boolean }>>`
            SELECT is_active AS "isActive" FROM "cost_allocation"."departments"
            WHERE id = ${id}::uuid AND workspace_id = ${workspaceId.getValue()}::uuid FOR SHARE
          `
        : kind === 'costCenter'
          ? await tx.$queryRaw<Array<{ isActive: boolean }>>`
              SELECT is_active AS "isActive" FROM "cost_allocation"."cost_centers"
              WHERE id = ${id}::uuid AND workspace_id = ${workspaceId.getValue()}::uuid FOR SHARE
            `
          : await tx.$queryRaw<Array<{ isActive: boolean }>>`
              SELECT is_active AS "isActive" FROM "cost_allocation"."projects"
              WHERE id = ${id}::uuid AND workspace_id = ${workspaceId.getValue()}::uuid FOR SHARE
            `;
      if (rows.length !== 1 || !rows[0].isActive) {
        throw new InvalidAllocationTargetError('Allocation target does not exist or is inactive in this workspace');
      }
    }

    const existingRecords = await tx.expenseAllocation.findMany({
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
    for (const existing of existingAllocations) {
      await this.dispatchEvents(existing, tx);
    }

    for (const allocation of newAllocations) {
      await this.dispatchEvents(allocation, tx);
    }

    if (newAllocations.length > 0) {
      const carrier = newAllocations[0];
      carrier.recordReplacement(newAllocations.length);
      await this.dispatchEvents(carrier, tx);
    } else if (existingAllocations.length > 0) {
      const carrier = existingAllocations[0];
      carrier.recordReplacement(0);
      await this.dispatchEvents(carrier, tx);
    }
    });
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
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
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
    await this.runInTransaction(async (tx) => {
    const expenseRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "expense_ledger"."expenses"
      WHERE id = ${expenseId}::uuid AND workspace_id = ${workspaceId.getValue()}::uuid
      FOR UPDATE
    `;
    if (expenseRows.length === 0) throw new ExpenseNotFoundError(expenseId);
    const records = await tx.expenseAllocation.findMany({
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

    await tx.expenseAllocation.deleteMany({
      where: {
        expenseId,
        workspaceId: workspaceId.getValue(),
      },
    });

    for (const allocation of allocations) {
      await this.dispatchEvents(allocation, tx);
    }
    });
  }
}
