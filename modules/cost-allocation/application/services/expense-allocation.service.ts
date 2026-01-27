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
} from "../../domain/errors/cost-allocation.errors";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export class ExpenseAllocationService {
  constructor(
    private readonly allocationRepository: ExpenseAllocationRepository,
    private readonly prisma: PrismaClient,
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

    // 1. Fetch Expense Validation Data
    const expense = await this.prisma.expense.findUnique({
      where: { id: params.expenseId },
      select: { amount: true, workspaceId: true },
    });

    if (!expense) {
      throw new ExpenseNotFoundError(params.expenseId);
    }

    if (expense.workspaceId !== params.workspaceId) {
      throw new ExpenseWorkspaceMismatchError(
        params.expenseId,
        params.workspaceId,
      );
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
    await this.allocationRepository.deleteByExpenseId(
      params.expenseId,
      workspaceId,
    );
    await this.allocationRepository.saveBatch(allocationEntities);
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
  ): Promise<void> {
    // Verify expense exists and belongs to workspace
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      select: { workspaceId: true },
    });

    if (!expense) {
      throw new ExpenseNotFoundError(expenseId);
    }

    if (expense.workspaceId !== workspaceId) {
      throw new ExpenseWorkspaceMismatchError(expenseId, workspaceId);
    }

    await this.allocationRepository.deleteByExpenseId(
      expenseId,
      WorkspaceId.fromString(workspaceId),
    );
  }

  async getAllocationSummary(workspaceId: string): Promise<{
    totalAllocations: number;
    byDepartment: Array<{ departmentId: string; departmentName: string; total: number; count: number }>;
    byCostCenter: Array<{ costCenterId: string; costCenterName: string; total: number; count: number }>;
    byProject: Array<{ projectId: string; projectName: string; total: number; count: number }>;
  }> {
    // Query allocation statistics grouped by target
    const departmentAllocations = await this.prisma.expenseAllocation.groupBy({
      by: ['departmentId'],
      where: {
        workspaceId,
        departmentId: { not: null },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const costCenterAllocations = await this.prisma.expenseAllocation.groupBy({
      by: ['costCenterId'],
      where: {
        workspaceId,
        costCenterId: { not: null },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const projectAllocations = await this.prisma.expenseAllocation.groupBy({
      by: ['projectId'],
      where: {
        workspaceId,
        projectId: { not: null },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Fetch department names
    const departmentIds = departmentAllocations
      .map((a) => a.departmentId)
      .filter((id): id is string => id !== null);
    const departments = await this.prisma.department.findMany({
      where: { id: { in: departmentIds } },
      select: { id: true, name: true },
    });
    const departmentMap = new Map(departments.map((d) => [d.id, d.name]));

    // Fetch cost center names
    const costCenterIds = costCenterAllocations
      .map((a) => a.costCenterId)
      .filter((id): id is string => id !== null);
    const costCenters = await this.prisma.costCenter.findMany({
      where: { id: { in: costCenterIds } },
      select: { id: true, name: true },
    });
    const costCenterMap = new Map(costCenters.map((c) => [c.id, c.name]));

    // Fetch project names
    const projectIds = projectAllocations
      .map((a) => a.projectId)
      .filter((id): id is string => id !== null);
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    });
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    // Calculate total allocations
    const totalAllocations = await this.prisma.expenseAllocation.count({
      where: { workspaceId },
    });

    return {
      totalAllocations,
      byDepartment: departmentAllocations.map((a) => ({
        departmentId: a.departmentId!,
        departmentName: departmentMap.get(a.departmentId!) || 'Unknown',
        total: a._sum.amount?.toNumber() || 0,
        count: a._count.id,
      })),
      byCostCenter: costCenterAllocations.map((a) => ({
        costCenterId: a.costCenterId!,
        costCenterName: costCenterMap.get(a.costCenterId!) || 'Unknown',
        total: a._sum.amount?.toNumber() || 0,
        count: a._count.id,
      })),
      byProject: projectAllocations.map((a) => ({
        projectId: a.projectId!,
        projectName: projectMap.get(a.projectId!) || 'Unknown',
        total: a._sum.amount?.toNumber() || 0,
        count: a._count.id,
      })),
    };
  }
}
