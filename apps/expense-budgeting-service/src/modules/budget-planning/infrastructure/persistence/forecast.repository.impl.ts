import { PrismaClient, Prisma } from "@prisma/client";
import { Forecast } from "../../domain/entities/forecast.entity";
import { IForecastRepository } from "../../domain/repositories/forecast.repository";
import { ForecastId } from "../../domain/value-objects/forecast-id";
import { PlanId } from "../../domain/value-objects/plan-id";
import { ForecastType } from "../../domain/enums/forecast-type.enum";
import {
  BudgetPlanNotFoundError,
  ForecastNotFoundError,
  ValidationError,
} from "../../domain/errors/budget-planning.errors";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';

export class ForecastRepositoryImpl
  implements IForecastRepository
{
  protected readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  protected get client(): PrismaClient | Prisma.TransactionClient {
    return PrismaUnitOfWork.getClient(this.prisma);
  }

  async save(forecast: Forecast): Promise<void> {
    const wsId = forecast.workspaceId.getValue();
    const planId = forecast.planId.getValue();
    const id = forecast.id.getValue();

    // Verify parent budget plan exists in the same workspace
    const parentPlan = await this.client.budgetPlan.findFirst({
      where: { id: planId, workspaceId: wsId },
      select: { id: true },
    });
    if (!parentPlan) {
      throw new BudgetPlanNotFoundError(planId, wsId);
    }

    const existing = await this.client.forecast.findUnique({
      where: { id },
      select: { id: true, workspaceId: true, planId: true },
    });

    if (existing) {
      if (existing.workspaceId !== wsId) {
        throw new ValidationError("Cannot update forecast belonging to another workspace");
      }
      if (existing.planId !== planId) {
        throw new ValidationError("Cannot reassign forecast to a different budget plan");
      }

      const updateResult = await this.client.forecast.updateMany({
        where: { id, workspaceId: wsId },
        data: {
          name: forecast.name,
          type: forecast.type,
          isActive: forecast.active,
          updatedAt: forecast.updatedAt,
        },
      });

      if (updateResult.count === 0) {
        throw new ForecastNotFoundError(id, wsId);
      }
    } else {
      await this.client.forecast.create({
        data: {
          id,
          workspaceId: wsId,
          planId,
          name: forecast.name,
          type: forecast.type,
          isActive: forecast.active,
          createdAt: forecast.createdAt,
          updatedAt: forecast.updatedAt,
        },
      });
    }
  }

  async findById(id: ForecastId, workspaceId: string): Promise<Forecast | null> {
    const raw = await this.client.forecast.findFirst({
      where: { id: id.getValue(), workspaceId },
    });

    if (!raw) return null;

    return Forecast.fromPersistence({
      id: raw.id,
      workspaceId: raw.workspaceId,
      planId: raw.planId,
      name: raw.name,
      type: raw.type as ForecastType,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findByPlanId(
    planId: PlanId,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Forecast>> {
    const where: Prisma.ForecastWhereInput = {
      planId: planId.getValue(),
      workspaceId,
    };

    return PrismaRepositoryHelper.paginate(
      this.client.forecast,
      { where, orderBy: { createdAt: "desc" } },
      (raw) =>
        Forecast.fromPersistence({
          id: raw.id,
          workspaceId: raw.workspaceId,
          planId: raw.planId,
          name: raw.name,
          type: raw.type as ForecastType,
          isActive: raw.isActive,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        }),
      options,
    );
  }

  async delete(id: ForecastId, workspaceId: string): Promise<void> {
    if (!workspaceId || workspaceId.trim() === '') {
      throw new ValidationError('Workspace ID is required for deleting a forecast');
    }

    const result = await this.client.forecast.deleteMany({
      where: { id: id.getValue(), workspaceId },
    });
    if (result.count === 0) {
      throw new ForecastNotFoundError(id.getValue(), workspaceId);
    }
  }

  async deleteWithItems(id: ForecastId, workspaceId: string): Promise<void> {
    if (!workspaceId || workspaceId.trim() === '') {
      throw new ValidationError('Workspace ID is required for deleting a forecast');
    }
    const client = this.client;
    const forecastIdStr = id.getValue();

    if (PrismaUnitOfWork.isTransactionClient(client)) {
      await client.forecastItem.deleteMany({
        where: { forecastId: forecastIdStr, workspaceId },
      });
      const result = await client.forecast.deleteMany({
        where: { id: forecastIdStr, workspaceId },
      });
      if (result.count === 0) {
        throw new ForecastNotFoundError(forecastIdStr, workspaceId);
      }
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.forecastItem.deleteMany({
          where: { forecastId: forecastIdStr, workspaceId },
        });
        const result = await tx.forecast.deleteMany({
          where: { id: forecastIdStr, workspaceId },
        });
        if (result.count === 0) {
          throw new ForecastNotFoundError(forecastIdStr, workspaceId);
        }
      });
    }
  }

  async findByName(planId: PlanId, name: string, workspaceId: string): Promise<Forecast | null> {
    const raw = await this.client.forecast.findFirst({
      where: {
        planId: planId.getValue(),
        name,
        workspaceId,
      },
    });

    if (!raw) return null;

    return Forecast.fromPersistence({
      id: raw.id,
      workspaceId: raw.workspaceId,
      planId: raw.planId,
      name: raw.name,
      type: raw.type as ForecastType,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async countByPlanId(planId: PlanId, workspaceId: string): Promise<number> {
    return this.client.forecast.count({
      where: {
        planId: planId.getValue(),
        workspaceId,
      },
    });
  }
}
