import { PrismaClient, Prisma } from "@prisma/client";
import { BudgetPlan } from "../../domain/entities/budget-plan.entity";
import { IBudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { WorkspaceId } from "../../../identity-workspace";
import { PlanStatus } from "../../domain/enums/plan-status.enum";
import { PeriodType } from "../../domain/enums/period-type.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';

export class BudgetPlanRepositoryImpl
  extends PrismaRepository<BudgetPlan>
  implements IBudgetPlanRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(plan: BudgetPlan): Promise<void> {
    const data = {
      id: plan.id.getValue(),
      workspaceId: plan.workspaceId.getValue(),
      name: plan.name,
      description: plan.description,
      periodType: plan.periodType,
      startDate: plan.period.startDate,
      endDate: plan.period.endDate,
      status: plan.status,
      createdBy: plan.createdBy.getValue(),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };

    await this.prisma.budgetPlan.upsert({
      where: { id: plan.id.getValue() },
      update: data,
      create: data,
    });

    await this.dispatchEvents(plan);
  }

  async findById(id: PlanId, workspaceId: string): Promise<BudgetPlan | null> {
    const raw = await this.prisma.budgetPlan.findFirst({
      where: { id: id.getValue(), workspaceId },
    });

    if (!raw) return null;

    return BudgetPlan.fromPersistence({
      id: raw.id,
      workspaceId: raw.workspaceId,
      name: raw.name,
      description: raw.description,
      periodType: raw.periodType as PeriodType,
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
        BudgetPlan.fromPersistence({
          id: raw.id,
          workspaceId: raw.workspaceId,
          name: raw.name,
          description: raw.description,
          periodType: raw.periodType as PeriodType,
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
