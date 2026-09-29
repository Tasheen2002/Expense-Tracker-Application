import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@expense-tracker/core';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import { AllocationAmount } from '../domain/value-objects/allocation-amount';
import { DepartmentId } from '../domain/value-objects/department-id';
import { ExpenseAllocation } from '../domain/entities/expense-allocation.entity';
import { ExpenseAllocationRepositoryImpl } from '../infrastructure/persistence/expense-allocation.repository.impl';
import { PrismaUnitOfWork } from '../../../shared/infrastructure/persistence/prisma-unit-of-work';
import { PrismaAllocationSummaryAdapter } from '../infrastructure/adapters/prisma-allocation-summary.adapter';
import { AllocationPercentageMismatchError, InvalidAllocationTargetError, InvalidTotalAllocationError } from '../domain/errors/cost-allocation.errors';

const prisma = new PrismaClient();
const workspaceId = randomUUID();
const userId = randomUUID();
const expenseId = randomUUID();
const otherExpenseId = randomUUID();
const raceExpenseId = randomUUID();
const percentageExpenseId = randomUUID();
const inactiveTargetExpenseId = randomUUID();
const departmentIds = Array.from({ length: 101 }, () => randomUUID());
const costCenterId = randomUUID();
const projectId = randomUUID();
const scope = WorkspaceId.fromString(workspaceId);
const repo = new ExpenseAllocationRepositoryImpl(prisma, new InMemoryEventBus());
const persistedAllocationIds: string[] = [];

function newAllocation(amount: number, targetId = departmentIds[0], forExpenseId = expenseId, percentage?: number) {
  return ExpenseAllocation.create({
    workspaceId: scope,
    expenseId: forExpenseId,
    amount: AllocationAmount.create(amount),
    percentage,
    departmentId: DepartmentId.fromString(targetId),
    createdBy: UserId.fromString(userId),
  });
}

describe('allocation persistence and summaries', () => {
  beforeAll(async () => {
    await prisma.expense.createMany({ data: [
      { id: expenseId, workspaceId, userId, title: 'USD expense', amount: 200, currency: 'USD', expenseDate: new Date() },
      { id: otherExpenseId, workspaceId, userId, title: 'EUR expense', amount: 200, currency: 'EUR', expenseDate: new Date() },
      { id: raceExpenseId, workspaceId, userId, title: 'Race expense', amount: 200, currency: 'USD', expenseDate: new Date() },
      { id: percentageExpenseId, workspaceId, userId, title: 'Percentage expense', amount: 200, currency: 'USD', expenseDate: new Date() },
      { id: inactiveTargetExpenseId, workspaceId, userId, title: 'Inactive target expense', amount: 200, currency: 'USD', expenseDate: new Date() },
    ] });
    await prisma.department.createMany({ data: departmentIds.map((id, index) => ({
      id, workspaceId, name: `Department ${index}`, code: `DEP${index}`,
    })) });
    await prisma.costCenter.create({ data: { id: costCenterId, workspaceId, name: 'Operations', code: 'OPS' } });
    await prisma.project.create({ data: { id: projectId, workspaceId, name: 'Launch', code: 'LAUNCH', startDate: new Date() } });
  });

  afterAll(async () => {
    await prisma.expenseAllocation.deleteMany({ where: { workspaceId } });
    await prisma.outboxEvent.deleteMany({ where: { aggregateType: 'ExpenseAllocation', aggregateId: { in: [expenseId, raceExpenseId, percentageExpenseId, inactiveTargetExpenseId, ...persistedAllocationIds] } } });
    await prisma.expense.deleteMany({ where: { id: { in: [expenseId, otherExpenseId, raceExpenseId, percentageExpenseId, inactiveTargetExpenseId] } } });
    await prisma.costCenter.delete({ where: { id: costCenterId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.department.deleteMany({ where: { workspaceId } });
    await prisma.$disconnect();
  });

  it('commits replacement data and outbox events together, and rejects an excessive total', async () => {
    const first = newAllocation(25);
    persistedAllocationIds.push(first.id.getValue());
    await repo.replaceAllocs(expenseId, scope, [first]);
    expect(await prisma.expenseAllocation.count({ where: { expenseId } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateType: 'ExpenseAllocation', aggregateId: first.id.getValue() } })).toBe(1);

    await expect(repo.replaceAllocs(expenseId, scope, [newAllocation(201)]))
      .rejects.toThrow(InvalidTotalAllocationError);
    expect(await prisma.expenseAllocation.findUnique({ where: { id: first.id.getValue() } })).not.toBeNull();

    const replacement = newAllocation(30);
    await expect(new PrismaUnitOfWork(prisma).execute(async () => {
      await repo.replaceAllocs(expenseId, scope, [replacement]);
      throw new Error('rollback');
    })).rejects.toThrow('rollback');
    expect(await prisma.expenseAllocation.findUnique({ where: { id: first.id.getValue() } })).not.toBeNull();
    expect(await prisma.outboxEvent.count({ where: { aggregateId: replacement.id.getValue() } })).toBe(0);
  });

  it('groups all target types by currency with exact totals and scoped names', async () => {
    await prisma.expenseAllocation.createMany({ data: [
      ...departmentIds.map((departmentId) => ({ id: randomUUID(), workspaceId, expenseId, departmentId, amount: 1, createdBy: userId })),
      { id: randomUUID(), workspaceId, expenseId: otherExpenseId, departmentId: departmentIds[0], amount: 2, createdBy: userId },
      { id: randomUUID(), workspaceId, expenseId, costCenterId, amount: 3, createdBy: userId },
      { id: randomUUID(), workspaceId, expenseId: otherExpenseId, costCenterId, amount: 4, createdBy: userId },
      { id: randomUUID(), workspaceId, expenseId, projectId, amount: 5, createdBy: userId },
      { id: randomUUID(), workspaceId, expenseId: otherExpenseId, projectId, amount: 6, createdBy: userId },
    ] });
    const summary = new PrismaAllocationSummaryAdapter(prisma);
    const snapshot = await summary.getSnapshot(workspaceId);
    expect(snapshot.totalAllocations).toBe(107);
    expect(snapshot.byDepartment).toHaveLength(102);
    expect(new Set(snapshot.byDepartment.map((row) => row.targetName)).size).toBe(101);
    expect(snapshot.byDepartment.filter((row) => row.targetId === departmentIds[0])
      .map((row) => [row.currency, row.total.toString(), row.targetName]).sort())
      .toEqual([['EUR', '2', 'Department 0'], ['USD', '26', 'Department 0']]);
    expect(snapshot.byCostCenter.map((row) => [row.currency, row.total.toString(), row.targetName]).sort())
      .toEqual([['EUR', '4', 'Operations'], ['USD', '3', 'Operations']]);
    expect(snapshot.byProject.map((row) => [row.currency, row.total.toString(), row.targetName]).sort())
      .toEqual([['EUR', '6', 'Launch'], ['USD', '5', 'Launch']]);
  });

  it('rejects a mismatched percentage without replacing existing allocations', async () => {
    const original = newAllocation(25, departmentIds[0], percentageExpenseId);
    const valid = newAllocation(50, departmentIds[0], percentageExpenseId, 25);
    persistedAllocationIds.push(original.id.getValue(), valid.id.getValue());
    await repo.replaceAllocs(percentageExpenseId, scope, [original]);

    await expect(repo.replaceAllocs(percentageExpenseId, scope, [
      newAllocation(50, departmentIds[0], percentageExpenseId, 20),
    ])).rejects.toThrow(AllocationPercentageMismatchError);
    expect(await prisma.expenseAllocation.findUnique({ where: { id: original.id.getValue() } })).not.toBeNull();

    await repo.replaceAllocs(percentageExpenseId, scope, [valid]);
    const stored = await prisma.expenseAllocation.findUniqueOrThrow({ where: { id: valid.id.getValue() } });
    expect(stored.percentage?.toNumber()).toBe(25);
  });

  it('rejects a target deactivated after application validation', async () => {
    await prisma.department.update({ where: { id: departmentIds[3] }, data: { isActive: false } });
    try {
      await expect(repo.replaceAllocs(inactiveTargetExpenseId, scope, [
        newAllocation(25, departmentIds[3], inactiveTargetExpenseId),
      ])).rejects.toThrow(InvalidAllocationTargetError);
      expect(await prisma.expenseAllocation.count({ where: { expenseId: inactiveTargetExpenseId } })).toBe(0);
    } finally {
      await prisma.department.update({ where: { id: departmentIds[3] }, data: { isActive: true } });
    }
  });

  it('serializes concurrent replacements of the same expense', async () => {
    const first = newAllocation(70, departmentIds[1], raceExpenseId);
    const second = newAllocation(80, departmentIds[2], raceExpenseId);
    persistedAllocationIds.push(first.id.getValue(), second.id.getValue());
    await Promise.all([
      repo.replaceAllocs(raceExpenseId, scope, [first]),
      repo.replaceAllocs(raceExpenseId, scope, [second]),
    ]);
    const rows = await prisma.expenseAllocation.findMany({ where: { expenseId: raceExpenseId } });
    expect(rows).toHaveLength(1);
    expect([first.id.getValue(), second.id.getValue()]).toContain(rows[0].id);
  });

  it('returns allocations in creation order with an ID tie-breaker', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    await prisma.expenseAllocation.createMany({ data: ids.map((id) => ({
      id, workspaceId, expenseId: inactiveTargetExpenseId,
      departmentId: departmentIds[0], amount: 1, createdBy: userId, createdAt,
    })) });
    const rows = await repo.findByExpenseId(inactiveTargetExpenseId, scope);
    expect(rows.map((row) => row.id.getValue())).toEqual([...ids].sort());
  });
});
