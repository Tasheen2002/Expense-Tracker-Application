import { PrismaClient, BudgetPeriodType } from "@prisma/client";
import { BudgetPlan } from "../../domain/entities/budget-plan.entity";
import { BudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { PlanStatus } from "../../domain/enums/plan-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class BudgetPlanRepositoryImpl implements BudgetPlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(plan: BudgetPlan): Promise<void> {
    const data = {
      id: plan.getId().getValue(),
      workspaceId: plan.getWorkspaceId().getValue(),
      name: plan.getName(),
      description: plan.getDescription(),
      periodType: BudgetPeriodType.CUSTOM, // Defaulting to CUSTOM as specified in schema for now, logic to be refined with Value Object mapping
      startDate: plan.getPeriod().getStartDate(),
      endDate: plan.getPeriod().getEndDate(),
      status: plan.getStatus(),
      createdBy: plan.getCreatedBy().getValue(),
      createdAt: plan.getCreatedAt(),
      updatedAt: plan.getUpdatedAt(),
    };

    await this.prisma.budgetPlan.upsert({
      where: { id: plan.getId().getValue() },
      update: data,
      create: data,
    });
  }

  async findById(id: PlanId): Promise<BudgetPlan | null> {
    const raw = await this.prisma.budgetPlan.findUnique({
      where: { id: id.getValue() },
    });

    if (!raw) return null;

    return BudgetPlan.reconstitute({
      id: raw.id,
      workspaceId: raw.workspaceId,
      name: raw.name,
      description: raw.description,
      startDate: raw.startDate,
      endDate: raw.endDate,
      status: raw.status as PlanStatus,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findAll(
    workspaceId: WorkspaceId,
    status?: PlanStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetPlan>> {
    const where: any = { workspaceId: workspaceId.getValue() };
    if (status) {
      where.status = status;
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [rows, total] = await Promise.all([
      this.prisma.budgetPlan.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.budgetPlan.count({ where }),
    ]);

    return {
      items: rows.map((raw: any) =>
        BudgetPlan.reconstitute({
          id: raw.id,
          workspaceId: raw.workspaceId,
          name: raw.name,
          description: raw.description,
          startDate: raw.startDate,
          endDate: raw.endDate,
          status: raw.status as PlanStatus,
          createdBy: raw.createdBy,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        }),
      ),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  async delete(id: PlanId): Promise<void> {
    await this.prisma.budgetPlan.delete({
      where: { id: id.getValue() },
    });
  }
}
