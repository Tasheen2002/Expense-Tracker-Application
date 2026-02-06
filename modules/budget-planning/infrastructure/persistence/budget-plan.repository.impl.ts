import { PrismaClient, BudgetPeriodType, Prisma } from "@prisma/client";
import { BudgetPlan } from "../../domain/entities/budget-plan.entity";
import { BudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { PlanStatus } from "../../domain/enums/plan-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";
import { PrismaRepository } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";

export class BudgetPlanRepositoryImpl
  extends PrismaRepository<BudgetPlan>
  implements BudgetPlanRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

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

    await this.dispatchEvents(plan);
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
    const where: Prisma.BudgetPlanWhereInput = {
      workspaceId: workspaceId.getValue(),
    };
    if (status) {
      where.status = status;
    }

    return PrismaRepositoryHelper.paginate(
      this.prisma.budgetPlan,
      { where, orderBy: { createdAt: "desc" } },
      (raw) =>
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
      options,
    );
  }

  async delete(id: PlanId): Promise<void> {
    await this.prisma.budgetPlan.delete({
      where: { id: id.getValue() },
    });
  }
}
