import { describe, it, expect } from "vitest";
import { ExpenseAllocation } from "../domain/entities/expense-allocation.entity";
import { AllocationAmount } from "../domain/value-objects/allocation-amount";
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import { DepartmentId } from "../domain/value-objects/department-id";
import { CostCenterId } from "../domain/value-objects/cost-center-id";
import { ProjectId } from "../domain/value-objects/project-id";
import { AllocationPercentageMismatchError, InvalidAllocationTargetError } from "../domain/errors/cost-allocation.errors";
import { Decimal } from "@prisma/client/runtime/library";
import { randomUUID } from 'node:crypto';
import { InvalidAllocationExpenseIdError, InvalidAllocationNotesError, InvalidAllocationPercentageError } from '../domain/errors/cost-allocation.errors';

describe("ExpenseAllocation Entity", () => {
  const workspaceId = WorkspaceId.create();
  const userId = UserId.create();
  const expenseId = randomUUID();
  const amount = AllocationAmount.create(new Decimal(100));

  it("should create a valid department allocation", () => {
    const departmentId = DepartmentId.create();
    const allocation = ExpenseAllocation.create({
      workspaceId,
      expenseId,
      amount,
      departmentId,
      createdBy: userId,
    });

    expect(allocation).toBeDefined();
    expect(allocation.departmentId?.equals(departmentId)).toBe(true);
    expect(allocation.costCenterId).toBeNull();
    expect(allocation.projectId).toBeNull();
  });

  it("should create a valid cost center allocation", () => {
    const costCenterId = CostCenterId.create();
    const allocation = ExpenseAllocation.create({
      workspaceId,
      expenseId,
      amount,
      costCenterId,
      createdBy: userId,
    });

    expect(allocation).toBeDefined();
    expect(allocation.costCenterId?.equals(costCenterId)).toBe(true);
    expect(allocation.departmentId).toBeNull();
  });

  it("should create a valid project allocation", () => {
    const projectId = ProjectId.create();
    const allocation = ExpenseAllocation.create({
      workspaceId,
      expenseId,
      amount,
      projectId,
      createdBy: userId,
    });

    expect(allocation).toBeDefined();
    expect(allocation.projectId?.equals(projectId)).toBe(true);
  });

  it("should throw error if multiple targets provided", () => {
    const departmentId = DepartmentId.create();
    const costCenterId = CostCenterId.create();

    expect(() => {
      ExpenseAllocation.create({
        workspaceId,
        expenseId,
        amount,
        departmentId,
        costCenterId,
        createdBy: userId,
      });
    }).toThrow(InvalidAllocationTargetError);
  });

  it("should throw error if no targets provided", () => {
    expect(() => {
      ExpenseAllocation.create({
        workspaceId,
        expenseId,
        amount,
        createdBy: userId,
      });
    }).toThrow(InvalidAllocationTargetError);
  });

  it('rejects invalid expense IDs, percentages, and oversized notes', () => {
    const departmentId = DepartmentId.create();
    const base = { workspaceId, expenseId, amount, departmentId, createdBy: userId };
    expect(() => ExpenseAllocation.create({ ...base, expenseId: 'not-a-uuid' }))
      .toThrow(InvalidAllocationExpenseIdError);
    for (const percentage of [-1, 100.01, 10.123, Number.NaN]) {
      expect(() => ExpenseAllocation.create({ ...base, percentage }))
        .toThrow(InvalidAllocationPercentageError);
    }
    expect(() => ExpenseAllocation.create({ ...base, notes: 'x'.repeat(501) }))
      .toThrow(InvalidAllocationNotesError);
    expect(ExpenseAllocation.create({ ...base, percentage: 100, notes: 'x'.repeat(500) }).percentage)
      .toBe(100);
  });

  it('does not expose its mutable creation timestamp', () => {
    const allocation = ExpenseAllocation.create({
      workspaceId, expenseId, amount, departmentId: DepartmentId.create(), createdBy: userId,
    });
    const original = allocation.createdAt.getTime();
    allocation.createdAt.setFullYear(2000);
    expect(allocation.createdAt.getTime()).toBe(original);
  });

  it('derives replacement event identity and emits deletion only once', () => {
    const allocation = ExpenseAllocation.create({
      workspaceId, expenseId, amount, departmentId: DepartmentId.create(), createdBy: userId,
    });
    allocation.clearDomainEvents();
    allocation.markAsDeleted();
    allocation.markAsDeleted();
    allocation.recordReplacement(2);
    expect(allocation.domainEvents.map((event) => event.eventType)).toEqual([
      'ExpenseAllocationDeleted', 'ExpenseAllocationsReplaced',
    ]);
    expect(allocation.domainEvents[1].getPayload()).toMatchObject({
      expenseId, workspaceId: workspaceId.getValue(), newAllocationCount: 2,
    });
    expect(() => allocation.recordReplacement(-1)).toThrow(InvalidAllocationTargetError);
  });

  it('checks a supplied percentage against the rounded expense share', () => {
    const base = { workspaceId, expenseId, departmentId: DepartmentId.create(), createdBy: userId };
    const matching = ExpenseAllocation.create({ ...base, amount: AllocationAmount.create('0.01'), percentage: 33.33 });
    expect(() => matching.validatePercentageOf('0.03')).not.toThrow();
    const mismatched = ExpenseAllocation.create({ ...base, amount: AllocationAmount.create(50), percentage: 20 });
    expect(() => mismatched.validatePercentageOf(200)).toThrow(AllocationPercentageMismatchError);
    const withoutPercentage = ExpenseAllocation.create({ ...base, amount: AllocationAmount.create(50) });
    expect(() => withoutPercentage.validatePercentageOf(200)).not.toThrow();
  });
});
