import { describe, it, expect } from "vitest";
import { ExpenseAllocation } from "../domain/entities/expense-allocation.entity";
import { AllocationAmount } from "../domain/value-objects/allocation-amount";
import { WorkspaceId } from "../../identity-workspace/domain/value-objects/workspace-id.vo";
import { DepartmentId } from "../domain/value-objects/department-id";
import { CostCenterId } from "../domain/value-objects/cost-center-id";
import { ProjectId } from "../domain/value-objects/project-id";
import { UserId } from "../../identity-workspace/domain/value-objects/user-id.vo";
import { InvalidAllocationTargetError } from "../domain/errors/cost-allocation.errors";
import { Decimal } from "@prisma/client/runtime/library";

describe("ExpenseAllocation Entity", () => {
  const workspaceId = WorkspaceId.create();
  const userId = UserId.create();
  const expenseId = "expense-uuid";
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
    expect(allocation.getDepartmentId()?.equals(departmentId)).toBe(true);
    expect(allocation.getCostCenterId()).toBeNull();
    expect(allocation.getProjectId()).toBeNull();
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
    expect(allocation.getCostCenterId()?.equals(costCenterId)).toBe(true);
    expect(allocation.getDepartmentId()).toBeNull();
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
    expect(allocation.getProjectId()?.equals(projectId)).toBe(true);
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
});
