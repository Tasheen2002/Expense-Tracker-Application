import { PrismaClient } from "@prisma/client";
import { ExpenseAllocation } from "../../domain/entities/expense-allocation.entity";
import { ExpenseAllocationRepository } from "../../domain/repositories/expense-allocation.repository";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";

export class ExpenseAllocationRepositoryImpl implements ExpenseAllocationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(allocation: ExpenseAllocation): Promise<void> {
    await this.prisma.expenseAllocation.create({
      data: {
        id: allocation.getId(),
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
  }

  async saveBatch(allocations: ExpenseAllocation[]): Promise<void> {
    await this.prisma.expenseAllocation.createMany({
      data: allocations.map((a) => ({
        id: a.getId(),
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
    await this.prisma.expenseAllocation.deleteMany({
      where: {
        expenseId: expenseId,
        workspaceId: workspaceId.getValue(),
      },
    });
  }
}
