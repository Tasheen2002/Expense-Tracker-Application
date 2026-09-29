import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@expense-tracker/core';
import { WorkspaceId } from '@core/domain/value-objects';
import { DepartmentId } from '../domain/value-objects/department-id';
import { DepartmentRepositoryImpl } from '../infrastructure/persistence/department.repository.impl';
import { PrismaExpenseLookupAdapter } from '../infrastructure/adapters/prisma-expense-lookup.adapter';
import { PrismaAllocationSummaryAdapter } from '../infrastructure/adapters/prisma-allocation-summary.adapter';

const prisma = new PrismaClient();
const workspaceId = randomUUID();
const otherWorkspaceId = randomUUID();
const userId = randomUUID();
const expenseId = randomUUID();
const departmentId = randomUUID();
const otherDepartmentId = randomUUID();
const costCenterId = randomUUID();
const otherCostCenterId = randomUUID();
const projectId = randomUUID();
const otherProjectId = randomUUID();

function allocation(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    workspaceId,
    expenseId,
    amount: 25,
    departmentId,
    createdBy: userId,
    ...overrides,
  };
}

describe('cost-allocation PostgreSQL integrity', () => {
  beforeAll(async () => {
    await prisma.expense.create({
      data: {
        id: expenseId,
        workspaceId,
        userId,
        title: 'Allocation integrity test',
        amount: 100,
        expenseDate: new Date(),
      },
    });
    await prisma.department.createMany({
      data: [
        { id: departmentId, workspaceId, name: 'Local', code: randomUUID().slice(0, 20) },
        { id: otherDepartmentId, workspaceId: otherWorkspaceId, name: 'Other', code: randomUUID().slice(0, 20) },
      ],
    });
    await prisma.costCenter.createMany({ data: [
      { id: costCenterId, workspaceId, name: 'Local center', code: randomUUID().slice(0, 20) },
      { id: otherCostCenterId, workspaceId: otherWorkspaceId, name: 'Other center', code: randomUUID().slice(0, 20) },
    ] });
    await prisma.project.createMany({ data: [
      { id: projectId, workspaceId, name: 'Local project', code: randomUUID().slice(0, 20), startDate: new Date() },
      { id: otherProjectId, workspaceId: otherWorkspaceId, name: 'Other project', code: randomUUID().slice(0, 20), startDate: new Date() },
    ] });
  });

  afterAll(async () => {
    await prisma.expenseAllocation.deleteMany({ where: { expenseId } });
    await prisma.expense.deleteMany({ where: { id: expenseId } });
    await prisma.costCenter.deleteMany({ where: { id: { in: [costCenterId, otherCostCenterId] } } });
    await prisma.project.deleteMany({ where: { id: { in: [projectId, otherProjectId] } } });
    await prisma.department.deleteMany({ where: { id: { in: [departmentId, otherDepartmentId] } } });
    await prisma.$disconnect();
  });

  it('rejects an allocation to another workspace', async () => {
    await expect(prisma.expenseAllocation.create({
      data: allocation({ departmentId: otherDepartmentId }),
    })).rejects.toThrow();
  });

  it('keeps a department lookup inside its workspace', async () => {
    const repository = new DepartmentRepositoryImpl(prisma, new InMemoryEventBus());
    expect(await repository.findById(
      DepartmentId.fromString(departmentId), WorkspaceId.fromString(otherWorkspaceId),
    )).toBeNull();
    expect(await repository.findById(
      DepartmentId.fromString(departmentId), WorkspaceId.fromString(workspaceId),
    )).not.toBeNull();
  });

  it('does not reveal an expense through a different workspace lookup', async () => {
    const lookup = new PrismaExpenseLookupAdapter(prisma);
    expect(await lookup.findExpenseForAllocation(expenseId, otherWorkspaceId)).toBeNull();
    expect(await lookup.findExpenseForAllocation(expenseId, workspaceId)).not.toBeNull();
  });

  it('scopes every summary group and name to its workspace', async () => {
    const foreignExpenseId = randomUUID();
    await prisma.expense.create({ data: {
      id: foreignExpenseId, workspaceId: otherWorkspaceId, userId,
      title: 'Foreign expense', amount: 100, expenseDate: new Date(),
    } });
    try {
      await prisma.expenseAllocation.createMany({ data: [
        allocation(),
        allocation({ departmentId: null, costCenterId }),
        allocation({ departmentId: null, projectId }),
        allocation({ workspaceId: otherWorkspaceId, expenseId: foreignExpenseId, departmentId: otherDepartmentId }),
        allocation({ workspaceId: otherWorkspaceId, expenseId: foreignExpenseId, departmentId: null, costCenterId: otherCostCenterId }),
        allocation({ workspaceId: otherWorkspaceId, expenseId: foreignExpenseId, departmentId: null, projectId: otherProjectId }),
      ] });
      const snapshot = await new PrismaAllocationSummaryAdapter(prisma).getSnapshot(workspaceId);
      expect(snapshot.totalAllocations).toBe(3);
      expect(snapshot.byDepartment.map((row) => [row.targetId, row.targetName]))
        .toEqual([[departmentId, 'Local']]);
      expect(snapshot.byCostCenter.map((row) => [row.targetId, row.targetName]))
        .toEqual([[costCenterId, 'Local center']]);
      expect(snapshot.byProject.map((row) => [row.targetId, row.targetName]))
        .toEqual([[projectId, 'Local project']]);
    } finally {
      await prisma.expenseAllocation.deleteMany({ where: { expenseId: foreignExpenseId } });
      await prisma.expense.delete({ where: { id: foreignExpenseId } });
    }
  });

  it('rejects cross-workspace and self-parenting departments', async () => {
    await expect(prisma.department.update({
      where: { id: departmentId }, data: { parentDepartmentId: otherDepartmentId },
    })).rejects.toThrow();
    await expect(prisma.department.update({
      where: { id: departmentId }, data: { parentDepartmentId: departmentId },
    })).rejects.toThrow();
  });

  it('prevents concurrent department reparenting from creating a cycle', async () => {
    const firstId = randomUUID();
    const secondId = randomUUID();
    await prisma.department.createMany({ data: [
      { id: firstId, workspaceId, name: 'First', code: randomUUID().slice(0, 20) },
      { id: secondId, workspaceId, name: 'Second', code: randomUUID().slice(0, 20) },
    ] });
    try {
      const outcomes = await Promise.allSettled([
        prisma.department.update({ where: { id: firstId }, data: { parentDepartmentId: secondId } }),
        prisma.department.update({ where: { id: secondId }, data: { parentDepartmentId: firstId } }),
      ]);
      expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
      expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
    } finally {
      await prisma.department.updateMany({
        where: { id: { in: [firstId, secondId] } }, data: { parentDepartmentId: null },
      });
      await prisma.department.deleteMany({ where: { id: { in: [firstId, secondId] } } });
    }
  });

  it('rejects invalid project dates and budgets at the database boundary', async () => {
    const base = {
      workspaceId,
      name: 'Invalid project',
      code: randomUUID().slice(0, 20),
      startDate: new Date('2026-02-01'),
    };
    await expect(prisma.project.create({
      data: { ...base, endDate: new Date('2026-01-01') },
    })).rejects.toThrow();
    await expect(prisma.project.create({
      data: { ...base, budget: -1 },
    })).rejects.toThrow();
  });

  it('rejects an orphan expense and invalid target or amount', async () => {
    await expect(prisma.expenseAllocation.create({
      data: allocation({ expenseId: randomUUID() }),
    })).rejects.toThrow();
    await expect(prisma.expenseAllocation.create({
      data: allocation({ departmentId: null }),
    })).rejects.toThrow();
    await expect(prisma.expenseAllocation.create({
      data: allocation({ costCenterId }),
    })).rejects.toThrow();
    await expect(prisma.expenseAllocation.create({
      data: allocation({ amount: 0 }),
    })).rejects.toThrow();
    await expect(prisma.expenseAllocation.create({
      data: allocation({ percentage: 101 }),
    })).rejects.toThrow();
  });

  it('cascades allocations when their expense is deleted', async () => {
    await prisma.expenseAllocation.create({ data: allocation() });
    await prisma.expense.delete({ where: { id: expenseId } });
    expect(await prisma.expenseAllocation.count({ where: { expenseId } })).toBe(0);
  });
});
