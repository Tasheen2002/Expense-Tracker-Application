import { PrismaClient, Prisma } from "@prisma/client";
import { BudgetPlan } from "../../domain/entities/budget-plan.entity";
import { IBudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { PlanPeriod } from "../../domain/value-objects/plan-period";
import { WorkspaceId } from '@core/domain/value-objects';
import { PlanStatus } from "../../domain/enums/plan-status.enum";
import { PeriodType } from "../../domain/enums/period-type.enum";
import {
  BudgetPlanConcurrencyConflictError,
  BudgetPlanNotFoundError,
  CannotDeleteActivePlanError,
  ValidationError,
} from "../../domain/errors/budget-planning.errors";
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
    let nextVersion: number | null = null;

    await this.runInTransaction(async (tx) => {
      const existing = await tx.budgetPlan.findUnique({
        where: { id: plan.id.getValue() },
        select: { id: true, version: true },
      });

      if (!existing) {
        await tx.budgetPlan.create({
          data: {
            id: plan.id.getValue(),
            workspaceId: plan.workspaceId.getValue(),
            name: plan.name,
            description: plan.description,
            periodType: plan.periodType,
            startDate: PlanPeriod.normalizeToUtcMidnight(plan.period.startDate),
            endDate: PlanPeriod.normalizeToUtcMidnight(plan.period.endDate),
            status: plan.status,
            createdBy: plan.createdBy.getValue(),
            version: plan.version,
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
          },
        });
      } else {
        const updateResult = await tx.budgetPlan.updateMany({
          where: {
            id: plan.id.getValue(),
            workspaceId: plan.workspaceId.getValue(),
            version: plan.version,
          },
          data: {
            name: plan.name,
            description: plan.description,
            periodType: plan.periodType,
            startDate: PlanPeriod.normalizeToUtcMidnight(plan.period.startDate),
            endDate: PlanPeriod.normalizeToUtcMidnight(plan.period.endDate),
            status: plan.status,
            version: { increment: 1 },
            updatedAt: plan.updatedAt,
          },
        });

        if (updateResult.count === 0) {
          throw new BudgetPlanConcurrencyConflictError(plan.id.getValue());
        }
        nextVersion = plan.version + 1;
      }

      await this.dispatchEvents(plan, tx);
    });

    if (nextVersion !== null) {
      plan.synchronizeVersion(nextVersion);
    }
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
      version: raw.version,
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
          version: raw.version,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        }),
      options,
    );
  }

  async delete(id: PlanId, workspaceId: string, plan?: BudgetPlan): Promise<void> {
    if (!workspaceId || workspaceId.trim() === '') {
      throw new ValidationError('Workspace ID is required for deleting a budget plan');
    }

    await this.runInTransaction(async (tx) => {
      let entityToDispatch = plan;
      let expectedVersion = plan?.version;

      if (!entityToDispatch) {
        const found = await tx.budgetPlan.findFirst({
          where: {
            id: id.getValue(),
            workspaceId,
          },
        });
        if (!found) {
          throw new BudgetPlanNotFoundError(id.getValue(), workspaceId);
        }
        if (found.status === PlanStatus.ACTIVE) {
          throw new CannotDeleteActivePlanError(id.getValue());
        }
        expectedVersion = found.version;
        entityToDispatch = BudgetPlan.fromPersistence({
          id: found.id,
          workspaceId: found.workspaceId,
          name: found.name,
          description: found.description,
          periodType: found.periodType as PeriodType,
          startDate: found.startDate,
          endDate: found.endDate,
          status: found.status as PlanStatus,
          createdBy: found.createdBy,
          version: found.version,
          createdAt: found.createdAt,
          updatedAt: found.updatedAt,
        });
        entityToDispatch.markAsDeleted();
      }

      // Optimistic concurrency and invariant-enforcing atomic delete:
      // Must match expected version AND guarantee status is not ACTIVE.
      const deleteResult = await tx.budgetPlan.deleteMany({
        where: {
          id: id.getValue(),
          workspaceId,
          ...(expectedVersion !== undefined ? { version: expectedVersion } : {}),
          status: { not: PlanStatus.ACTIVE },
        },
      });

      if (deleteResult.count === 0) {
        const current = await tx.budgetPlan.findUnique({
          where: { id: id.getValue() },
          select: { status: true, version: true, workspaceId: true },
        });

        if (!current || (current.workspaceId && current.workspaceId !== workspaceId)) {
          throw new BudgetPlanNotFoundError(id.getValue(), workspaceId);
        }

        if (current.status === PlanStatus.ACTIVE) {
          throw new CannotDeleteActivePlanError(id.getValue());
        }

        throw new BudgetPlanConcurrencyConflictError(id.getValue());
      }

      if (entityToDispatch) {
        await this.dispatchEvents(entityToDispatch, tx);
      }
    });
  }
}
