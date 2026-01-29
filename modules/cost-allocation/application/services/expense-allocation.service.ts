import { ExpenseAllocation } from "../../domain/entities/expense-allocation.entity";
import { ExpenseAllocationRepository } from "../../domain/repositories/expense-allocation.repository";
import { AllocationAmount } from "../../domain/value-objects/allocation-amount";
import { DepartmentId } from "../../domain/value-objects/department-id";
import { CostCenterId } from "../../domain/value-objects/cost-center-id";
import { ProjectId } from "../../domain/value-objects/project-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import {
  InvalidTotalAllocationError,
  InvalidAllocationAmountError,
  InvalidAllocationTargetError,
  ExpenseNotFoundError,
  ExpenseWorkspaceMismatchError,
  UnauthorizedAllocationAccessError,
} from "../../domain/errors/cost-allocation.errors";
import { Decimal } from "@prisma/client/runtime/library";
import { IExpenseLookupPort } from "../ports/expense-lookup.port";
import { IAllocationSummaryPort } from "../ports/allocation-summary.port";

export class ExpenseAllocationService {
  constructor(
    private readonly allocationRepository: ExpenseAllocationRepository,
    private readonly expenseLookup: IExpenseLookupPort,
    private readonly allocationSummary: IAllocationSummaryPort,
  ) {}

  async allocateExpense(params: {
    workspaceId: string;
    expenseId: string;
    createdBy: string;
    allocations: Array<{
      amount: number;
      percentage?: number;
      departmentId?: string;
      costCenterId?: string;
      projectId?: string;
      notes?: string;
    }>;
  }): Promise<void> {
    const workspaceId = WorkspaceId.fromString(params.workspaceId);

    // 1. Fetch Expense Validation Data via port (no direct Prisma dependency)
    const expense = await this.expenseLookup.findExpenseForAllocation(
      params.expenseId,
    );

    if (!expense) {
      throw new ExpenseNotFoundError(params.expenseId);
    }

    if (expense.workspaceId !== params.workspaceId) {
      throw new ExpenseWorkspaceMismatchError(
        params.expenseId,
        params.workspaceId,
      );
    }

    if (expense.userId !== params.createdBy) {
      throw new UnauthorizedAllocationAccessError("create");
    }

    const expenseTotal = expense.amount;
    let newAllocationTotal = new Decimal(0);

    // 2. Prepare Allocation Entities & Validate Items
    const allocationEntities: ExpenseAllocation[] = [];

    for (const alloc of params.allocations) {
      const amount = new Decimal(alloc.amount);

      // Validation: Positive Amount
      if (amount.lessThanOrEqualTo(0)) {
        throw new InvalidAllocationAmountError(amount.toNumber());
      }

      // Validation: Exactly One Target
      this.validateAllocationTarget(
        alloc.departmentId,
        alloc.costCenterId,
        alloc.projectId,
      );

      newAllocationTotal = newAllocationTotal.add(amount);

      const entity = ExpenseAllocation.create({
        workspaceId,
        expenseId: params.expenseId,
        amount: AllocationAmount.create(amount),
        percentage: alloc.percentage ? new Decimal(alloc.percentage) : null,
        departmentId: alloc.departmentId
          ? DepartmentId.fromString(alloc.departmentId)
          : undefined,
        costCenterId: alloc.costCenterId
          ? CostCenterId.fromString(alloc.costCenterId)
          : undefined,
        projectId: alloc.projectId
          ? ProjectId.fromString(alloc.projectId)
          : undefined,
        notes: alloc.notes,
        createdBy: UserId.fromString(params.createdBy),
      });

      allocationEntities.push(entity);
    }

    // 3. Validation: Total Sum <= Expense Total
    if (newAllocationTotal.greaterThan(expenseTotal)) {
      throw new InvalidTotalAllocationError(
        newAllocationTotal.toNumber(),
        expenseTotal.toNumber(),
      );
    }

    // 4. Persistence
    await this.allocationRepository.replaceAllocs(
      params.expenseId,
      workspaceId,
      allocationEntities,
    );
  }

  private validateAllocationTarget(
    departmentId?: string,
    costCenterId?: string,
    projectId?: string,
  ): void {
    const targets = [departmentId, costCenterId, projectId].filter(Boolean);

    if (targets.length === 0) {
      throw new InvalidAllocationTargetError(
        "At least one target (department, cost center, or project) must be specified",
      );
    }

    if (targets.length > 1) {
      throw new InvalidAllocationTargetError(
        "Only one target (department, cost center, or project) can be specified per allocation",
      );
    }
  }

  async getAllocations(
    expenseId: string,
    workspaceId: string,
  ): Promise<ExpenseAllocation[]> {
    return this.allocationRepository.findByExpenseId(
      expenseId,
      WorkspaceId.fromString(workspaceId),
    );
  }

  async deleteAllocations(
    expenseId: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    // Verify expense exists and belongs to workspace via port
    const expense =
      await this.expenseLookup.findExpenseForAllocation(expenseId);

    if (!expense) {
      throw new ExpenseNotFoundError(expenseId);
    }

    if (expense.workspaceId !== workspaceId) {
      throw new ExpenseWorkspaceMismatchError(expenseId, workspaceId);
    }

    if (expense.userId !== userId) {
      throw new UnauthorizedAllocationAccessError("delete");
    }

    await this.allocationRepository.deleteByExpenseId(
      expenseId,
      WorkspaceId.fromString(workspaceId),
    );
  }

  async getAllocationSummary(workspaceId: string): Promise<{
    totalAllocations: number;
    byDepartment: Array<{
      departmentId: string;
      departmentName: string;
      total: number;
      count: number;
    }>;
    byCostCenter: Array<{
      costCenterId: string;
      costCenterName: string;
      total: number;
      count: number;
    }>;
    byProject: Array<{
      projectId: string;
      projectName: string;
      total: number;
      count: number;
    }>;
  }> {
    // Query allocation statistics via port (no direct Prisma dependency)
    const [
      departmentAllocations,
      costCenterAllocations,
      projectAllocations,
      totalAllocations,
    ] = await Promise.all([
      this.allocationSummary.getByDepartment(workspaceId),
      this.allocationSummary.getByCostCenter(workspaceId),
      this.allocationSummary.getByProject(workspaceId),
      this.allocationSummary.getTotalCount(workspaceId),
    ]);

    // Fetch entity names via port
    const departmentIds = departmentAllocations.map((a) => a.targetId);
    const costCenterIds = costCenterAllocations.map((a) => a.targetId);
    const projectIds = projectAllocations.map((a) => a.targetId);

    const [departments, costCenters, projects] = await Promise.all([
      this.allocationSummary.getDepartmentNames(departmentIds),
      this.allocationSummary.getCostCenterNames(costCenterIds),
      this.allocationSummary.getProjectNames(projectIds),
    ]);

    const departmentMap = new Map(departments.map((d) => [d.id, d.name]));
    const costCenterMap = new Map(costCenters.map((c) => [c.id, c.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    return {
      totalAllocations,
      byDepartment: departmentAllocations.map((a) => ({
        departmentId: a.targetId,
        departmentName: departmentMap.get(a.targetId) || "Unknown",
        total: a.total.toNumber(),
        count: a.count,
      })),
      byCostCenter: costCenterAllocations.map((a) => ({
        costCenterId: a.targetId,
        costCenterName: costCenterMap.get(a.targetId) || "Unknown",
        total: a.total.toNumber(),
        count: a.count,
      })),
      byProject: projectAllocations.map((a) => ({
        projectId: a.targetId,
        projectName: projectMap.get(a.targetId) || "Unknown",
        total: a.total.toNumber(),
        count: a.count,
      })),
    };
  }
}
