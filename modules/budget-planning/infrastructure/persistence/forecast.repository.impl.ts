import { PrismaClient, Prisma } from "@prisma/client";
import { Forecast } from "../../domain/entities/forecast.entity";
import { ForecastRepository } from "../../domain/repositories/forecast.repository";
import { ForecastId } from "../../domain/value-objects/forecast-id";
import { PlanId } from "../../domain/value-objects/plan-id";
import { ForecastType } from "../../domain/enums/forecast-type.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";
import { PrismaRepository } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";

export class ForecastRepositoryImpl
  extends PrismaRepository<Forecast>
  implements ForecastRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(forecast: Forecast): Promise<void> {
    const data = {
      id: forecast.getId().getValue(),
      planId: forecast.getPlanId().getValue(),
      name: forecast.getName(),
      type: forecast.getType(),
      isActive: forecast.getIsActive(),
      createdAt: forecast.getCreatedAt(),
      updatedAt: forecast.getUpdatedAt(),
    };

    await this.prisma.forecast.upsert({
      where: { id: forecast.getId().getValue() },
      update: data,
      create: data,
    });

    await this.dispatchEvents(forecast);
  }

  async findById(id: ForecastId): Promise<Forecast | null> {
    const raw = await this.prisma.forecast.findUnique({
      where: { id: id.getValue() },
    });

    if (!raw) return null;

    return Forecast.reconstitute({
      id: raw.id,
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
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Forecast>> {
    const where: Prisma.ForecastWhereInput = {
      planId: planId.getValue(),
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.forecast,
      { where, orderBy: { createdAt: "desc" } },
      (raw) =>
        Forecast.reconstitute({
          id: raw.id,
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

  async delete(id: ForecastId): Promise<void> {
    await this.prisma.forecast.delete({
      where: { id: id.getValue() },
    });
  }

  async deleteWithItems(id: ForecastId): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Delete all forecast items first
      await tx.forecastItem.deleteMany({
        where: { forecastId: id.getValue() },
      });
      // Then delete the forecast
      await tx.forecast.delete({
        where: { id: id.getValue() },
      });
    });
  }

  async findByName(planId: PlanId, name: string): Promise<Forecast | null> {
    const raw = await this.prisma.forecast.findFirst({
      where: {
        planId: planId.getValue(),
        name: name,
      },
    });

    if (!raw) return null;

    return Forecast.reconstitute({
      id: raw.id,
      planId: raw.planId,
      name: raw.name,
      type: raw.type as ForecastType,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
