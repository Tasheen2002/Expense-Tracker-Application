import { ExpenseAllocation, ExpenseAllocationDTO } from "../../domain/entities/expense-allocation.entity";
import { IExpenseAllocationRepository } from "../../domain/repositories/expense-allocation.repository";
import { AllocationAmount } from "../../domain/value-objects/allocation-amount";
import { DepartmentId } from "../../domain/value-objects/department-id";
import { CostCenterId } from "../../domain/value-objects/cost-center-id";
import { ProjectId } from "../../domain/value-objects/project-id";
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import {
  InvalidTotalAllocationError,
  InvalidAllocationTargetError,
  ExpenseNotFoundError,
  UnauthorizedAllocationAccessError,
} from "../../domain/errors/cost-allocation.errors";
import Decimal from 'decimal.js';
import { IExpenseLookupPort } from "../ports/expense-lookup.port";
import { IAllocationSummaryPort } from "../ports/allocation-summary.port";
import { IDepartmentRepository } from "../../domain/repositories/department.repository";
import { ICostCenterRepository } from "../../domain/repositories/cost-center.repository";
import { IProjectRepository } from "../../domain/repositories/project.repository";
import { IWorkspaceAccessPort } from "../ports/workspace-access.port";

export class ExpenseAllocationService {
  constructor(
    private readonly allocationRepository: IExpenseAllocationRepository,
    private readonly expenseLookup: IExpenseLookupPort,
    private readonly allocationSummary: IAllocationSummaryPort,
    private readonly departmentRepository: IDepartmentRepository,
    private readonly costCenterRepository: ICostCenterRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly workspaceAccess: IWorkspaceAccessPort,
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
  }): Promise<ExpenseAllocationDTO[]> {
    const workspaceId = WorkspaceId.fromString(params.workspaceId);

    if (!(await this.workspaceAccess.isAdminOrOwner(params.createdBy, params.workspaceId))) {
      throw new UnauthorizedAllocationAccessError("create allocations");
    }

    const expense = await this.expenseLookup.findExpenseForAllocation(
      params.expenseId,
      params.workspaceId,
    );

    if (!expense || expense.workspaceId !== params.workspaceId) {
      throw new ExpenseNotFoundError(params.expenseId);
    }

    const expenseTotal = expense.amount;
    let newAllocationTotal = new Decimal(0);

    const allocationEntities: ExpenseAllocation[] = [];

    for (const alloc of params.allocations) {
      const amount = AllocationAmount.create(alloc.amount);

      this.validateAllocationTarget(
        alloc.departmentId,
        alloc.costCenterId,
        alloc.projectId,
      );
      await this.validateTargetInWorkspace(alloc, params.workspaceId);

      newAllocationTotal = newAllocationTotal.add(amount.getValue());

      const entity = ExpenseAllocation.create({
        workspaceId,
        expenseId: params.expenseId,
        amount,
        percentage: alloc.percentage ?? null,
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
      entity.validatePercentageOf(expenseTotal);

      allocationEntities.push(entity);
    }

    if (newAllocationTotal.greaterThan(expenseTotal)) {
      throw new InvalidTotalAllocationError(
        newAllocationTotal.toNumber(),
        expenseTotal.toNumber(),
      );
    }

    await this.allocationRepository.replaceAllocs(
      params.expenseId,
      workspaceId,
      allocationEntities,
    );

    return allocationEntities.map(ExpenseAllocation.toDTO);
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

  private async validateTargetInWorkspace(
    allocation: { departmentId?: string; costCenterId?: string; projectId?: string },
    workspaceId: string,
  ): Promise<void> {
    const scope = WorkspaceId.fromString(workspaceId);
    const target = allocation.departmentId
      ? await this.departmentRepository.findById(DepartmentId.fromString(allocation.departmentId), scope)
      : allocation.costCenterId
        ? await this.costCenterRepository.findById(CostCenterId.fromString(allocation.costCenterId), scope)
        : await this.projectRepository.findById(ProjectId.fromString(allocation.projectId!), scope);

    if (!target || target.workspaceId.getValue() !== workspaceId || !target.isActive) {
      throw new InvalidAllocationTargetError(
        "Allocation target does not exist or is inactive in this workspace",
      );
    }
  }

  async getAllocations(
    expenseId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<ExpenseAllocationDTO[]> {
    if (!(await this.workspaceAccess.isMember(actorId, workspaceId))) {
      throw new UnauthorizedAllocationAccessError('view allocations');
    }
    const expense = await this.expenseLookup.findExpenseForAllocation(expenseId, workspaceId);
    if (!expense || expense.workspaceId !== workspaceId) {
      throw new ExpenseNotFoundError(expenseId);
    }
    const allocations = await this.allocationRepository.findByExpenseId(
      expenseId,
      WorkspaceId.fromString(workspaceId),
    );
    return allocations.map(ExpenseAllocation.toDTO);
  }

  async deleteAllocations(
    expenseId: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    if (!(await this.workspaceAccess.isAdminOrOwner(userId, workspaceId))) {
      throw new UnauthorizedAllocationAccessError("delete allocations");
    }

    const expense =
      await this.expenseLookup.findExpenseForAllocation(expenseId, workspaceId);

    if (!expense || expense.workspaceId !== workspaceId) {
      throw new ExpenseNotFoundError(expenseId);
    }

    await this.allocationRepository.deleteByExpenseId(
      expenseId,
      WorkspaceId.fromString(workspaceId),
    );
  }

  async getAllocationSummary(workspaceId: string, actorId: string): Promise<{
    totalAllocations: number;
    byDepartment: Array<{
      departmentId: string;
      departmentName: string;
      currency: string;
      total: string;
      count: number;
    }>;
    byCostCenter: Array<{
      costCenterId: string;
      costCenterName: string;
      currency: string;
      total: string;
      count: number;
    }>;
    byProject: Array<{
      projectId: string;
      projectName: string;
      currency: string;
      total: string;
      count: number;
    }>;
  }> {
    if (!(await this.workspaceAccess.isMember(actorId, workspaceId))) {
      throw new UnauthorizedAllocationAccessError('view allocation summary');
    }
    const summary = await this.allocationSummary.getSnapshot(workspaceId);

    return {
      totalAllocations: summary.totalAllocations,
      byDepartment: summary.byDepartment.map((a) => ({
        departmentId: a.targetId,
        departmentName: a.targetName,
        currency: a.currency,
        total: a.total.toFixed(2),
        count: a.count,
      })),
      byCostCenter: summary.byCostCenter.map((a) => ({
        costCenterId: a.targetId,
        costCenterName: a.targetName,
        currency: a.currency,
        total: a.total.toFixed(2),
        count: a.count,
      })),
      byProject: summary.byProject.map((a) => ({
        projectId: a.targetId,
        projectName: a.targetName,
        currency: a.currency,
        total: a.total.toFixed(2),
        count: a.count,
      })),
    };
  }
}
