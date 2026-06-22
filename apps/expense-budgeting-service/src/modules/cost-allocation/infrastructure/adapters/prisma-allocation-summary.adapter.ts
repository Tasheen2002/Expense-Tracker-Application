import { PrismaClient } from "@prisma/client";
import {
  IAllocationSummaryPort,
  AllocationGroupData,
  DepartmentSummary,
  CostCenterSummary,
  ProjectSummary,
} from "../../application/ports/allocation-summary.port";

/**
 * Prisma adapter for allocation summary queries.
 * Implements the port interface using PrismaClient.
 */
export class PrismaAllocationSummaryAdapter implements IAllocationSummaryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async getByDepartment(workspaceId: string): Promise<AllocationGroupData[]> {
    const results = await this.prisma.expenseAllocation.groupBy({
      by: ["departmentId"],
      where: {
        workspaceId,
        departmentId: { not: null },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    return results.map((r) => ({
      targetId: r.departmentId!,
      total: r._sum.amount!,
      count: r._count.id,
    }));
  }

  async getByCostCenter(workspaceId: string): Promise<AllocationGroupData[]> {
    const results = await this.prisma.expenseAllocation.groupBy({
      by: ["costCenterId"],
      where: {
        workspaceId,
        costCenterId: { not: null },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    return results.map((r) => ({
      targetId: r.costCenterId!,
      total: r._sum.amount!,
      count: r._count.id,
    }));
  }

  async getByProject(workspaceId: string): Promise<AllocationGroupData[]> {
    const results = await this.prisma.expenseAllocation.groupBy({
      by: ["projectId"],
      where: {
        workspaceId,
        projectId: { not: null },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    return results.map((r) => ({
      targetId: r.projectId!,
      total: r._sum.amount!,
      count: r._count.id,
    }));
  }

  async getTotalCount(workspaceId: string): Promise<number> {
    return this.prisma.expenseAllocation.count({
      where: { workspaceId },
    });
  }

  async getDepartmentNames(ids: string[]): Promise<DepartmentSummary[]> {
    const departments = await this.prisma.department.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
      take: 100,
    });
    return departments;
  }

  async getCostCenterNames(ids: string[]): Promise<CostCenterSummary[]> {
    const costCenters = await this.prisma.costCenter.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
      take: 100,
    });
    return costCenters;
  }

  async getProjectNames(ids: string[]): Promise<ProjectSummary[]> {
    const projects = await this.prisma.project.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
      take: 100,
    });
    return projects;
  }
}
