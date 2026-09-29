import { randomUUID } from 'node:crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpenseAllocationService } from '../application/services/expense-allocation.service';
import { IExpenseAllocationRepository } from '../domain/repositories/expense-allocation.repository';
import { IDepartmentRepository } from '../domain/repositories/department.repository';
import { ICostCenterRepository } from '../domain/repositories/cost-center.repository';
import { IProjectRepository } from '../domain/repositories/project.repository';
import { IExpenseLookupPort } from '../application/ports/expense-lookup.port';
import { IAllocationSummaryPort } from '../application/ports/allocation-summary.port';
import { IWorkspaceAccessPort } from '../application/ports/workspace-access.port';
import { ExpenseNotFoundError, InvalidAllocationTargetError, UnauthorizedAllocationAccessError } from '../domain/errors/cost-allocation.errors';

const workspaceId = randomUUID();
const otherWorkspaceId = randomUUID();
const expenseId = randomUUID();
const userId = randomUUID();
const departmentId = randomUUID();

describe('ExpenseAllocationService target isolation', () => {
  const replaceAllocs = vi.fn().mockResolvedValue(undefined);
  const findDepartment = vi.fn();
  const isAdminOrOwner = vi.fn().mockResolvedValue(true);
  const isMember = vi.fn().mockResolvedValue(true);
  const findExpenseForAllocation = vi.fn().mockResolvedValue({
    id: expenseId, workspaceId, userId, amount: new Decimal(100),
  });
  const expenseLookup = {
    findExpenseForAllocation,
  } as unknown as IExpenseLookupPort;
  const service = new ExpenseAllocationService(
    { replaceAllocs } as unknown as IExpenseAllocationRepository,
    expenseLookup,
    {} as IAllocationSummaryPort,
    { findById: findDepartment } as unknown as IDepartmentRepository,
    {} as ICostCenterRepository,
    {} as IProjectRepository,
    { isAdminOrOwner, isMember } as unknown as IWorkspaceAccessPort,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    isAdminOrOwner.mockResolvedValue(true);
    isMember.mockResolvedValue(true);
  });

  const allocate = () => service.allocateExpense({
    workspaceId,
    expenseId,
    createdBy: userId,
    allocations: [{ amount: 25, departmentId }],
  });

  it('rejects a department from a different workspace before writing', async () => {
    findDepartment.mockResolvedValue({
      workspaceId: { getValue: () => otherWorkspaceId },
      isActive: true,
    });

    await expect(allocate()).rejects.toThrow(InvalidAllocationTargetError);
    expect(replaceAllocs).not.toHaveBeenCalled();
  });

  it('rejects an inactive department before writing', async () => {
    findDepartment.mockResolvedValue({
      workspaceId: { getValue: () => workspaceId },
      isActive: false,
    });

    await expect(allocate()).rejects.toThrow(InvalidAllocationTargetError);
    expect(replaceAllocs).not.toHaveBeenCalled();
  });

  it('accepts an active department in the expense workspace', async () => {
    findDepartment.mockResolvedValue({
      workspaceId: { getValue: () => workspaceId },
      isActive: true,
    });

    await expect(allocate()).resolves.toHaveLength(1);
    expect(replaceAllocs).toHaveBeenCalledOnce();
  });

  it('allows an admin to allocate an expense owned by another workspace member', async () => {
    findDepartment.mockResolvedValue({ workspaceId: { getValue: () => workspaceId }, isActive: true });
    findExpenseForAllocation.mockResolvedValueOnce({
      id: expenseId, workspaceId, userId: randomUUID(), amount: new Decimal(100),
    });

    await expect(allocate()).resolves.toHaveLength(1);
    expect(isAdminOrOwner).toHaveBeenCalledWith(userId, workspaceId);
  });

  it('denies an ordinary member before writing', async () => {
    isAdminOrOwner.mockResolvedValue(false);
    await expect(allocate()).rejects.toThrow(UnauthorizedAllocationAccessError);
    expect(replaceAllocs).not.toHaveBeenCalled();
  });

  it('returns the same not-found error for an absent or out-of-workspace expense', async () => {
    findExpenseForAllocation.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: expenseId, workspaceId: otherWorkspaceId, userId, amount: new Decimal(100),
    });
    await expect(allocate()).rejects.toThrow(ExpenseNotFoundError);
    await expect(allocate()).rejects.toThrow(ExpenseNotFoundError);
    expect(findExpenseForAllocation).toHaveBeenCalledWith(expenseId, workspaceId);
    expect(replaceAllocs).not.toHaveBeenCalled();
  });

  it('uses a resource-neutral authorization message', async () => {
    const error = new UnauthorizedAllocationAccessError('create department');
    expect(error.message).toBe('You are not authorized to create department in this workspace.');
  });

  it('denies allocation reads before looking up the expense or its allocations', async () => {
    const findByExpenseId = vi.fn();
    const guarded = new ExpenseAllocationService(
      { findByExpenseId } as unknown as IExpenseAllocationRepository,
      expenseLookup,
      {} as IAllocationSummaryPort,
      {} as IDepartmentRepository,
      {} as ICostCenterRepository,
      {} as IProjectRepository,
      { isMember: vi.fn().mockResolvedValue(false) } as unknown as IWorkspaceAccessPort,
    );
    await expect(guarded.getAllocations(expenseId, workspaceId, userId))
      .rejects.toThrow(UnauthorizedAllocationAccessError);
    expect(findExpenseForAllocation).not.toHaveBeenCalled();
    expect(findByExpenseId).not.toHaveBeenCalled();
  });

  it('returns not found for an absent expense before listing allocations', async () => {
    const findByExpenseId = vi.fn();
    const guarded = new ExpenseAllocationService(
      { findByExpenseId } as unknown as IExpenseAllocationRepository,
      expenseLookup,
      {} as IAllocationSummaryPort,
      {} as IDepartmentRepository,
      {} as ICostCenterRepository,
      {} as IProjectRepository,
      { isMember } as unknown as IWorkspaceAccessPort,
    );
    findExpenseForAllocation.mockResolvedValueOnce(null);
    await expect(guarded.getAllocations(expenseId, workspaceId, userId))
      .rejects.toThrow(ExpenseNotFoundError);
    expect(findByExpenseId).not.toHaveBeenCalled();
  });

  it('denies summary reads before querying aggregates', async () => {
    const getSnapshot = vi.fn();
    const guarded = new ExpenseAllocationService(
      {} as IExpenseAllocationRepository,
      expenseLookup,
      { getSnapshot } as unknown as IAllocationSummaryPort,
      {} as IDepartmentRepository,
      {} as ICostCenterRepository,
      {} as IProjectRepository,
      { isMember: vi.fn().mockResolvedValue(false) } as unknown as IWorkspaceAccessPort,
    );
    await expect(guarded.getAllocationSummary(workspaceId, userId))
      .rejects.toThrow(UnauthorizedAllocationAccessError);
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it('returns exact decimal strings for large summary totals', async () => {
    const summary = {
      getSnapshot: vi.fn().mockResolvedValue({
        totalAllocations: 1,
        byDepartment: [{
          targetId: departmentId, targetName: 'Engineering', currency: 'USD',
          total: new Decimal('9007199254740993.12'), count: 1,
        }],
        byCostCenter: [],
        byProject: [],
      }),
    };
    const guarded = new ExpenseAllocationService(
      {} as IExpenseAllocationRepository,
      expenseLookup,
      summary,
      {} as IDepartmentRepository,
      {} as ICostCenterRepository,
      {} as IProjectRepository,
      { isMember } as unknown as IWorkspaceAccessPort,
    );

    const result = await guarded.getAllocationSummary(workspaceId, userId);
    expect(result.byDepartment[0].total).toBe('9007199254740993.12');
  });
});
