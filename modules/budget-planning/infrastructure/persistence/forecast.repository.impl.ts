import { PrismaClient } from "@prisma/client";
import { Forecast } from "../../domain/entities/forecast.entity";
import { ForecastRepository } from "../../domain/repositories/forecast.repository";
import { ForecastId } from "../../domain/value-objects/forecast-id";
import { PlanId } from "../../domain/value-objects/plan-id";
import { ForecastType } from "../../domain/enums/forecast-type.enum";

export class ForecastRepositoryImpl implements ForecastRepository {
  constructor(private readonly prisma: PrismaClient) {}

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

  async findByPlanId(planId: PlanId): Promise<Forecast[]> {
    const raws = await this.prisma.forecast.findMany({
      where: { planId: planId.getValue() },
      orderBy: { createdAt: "desc" },
    });

    return raws.map((raw) =>
      Forecast.reconstitute({
        id: raw.id,
        planId: raw.planId,
        name: raw.name,
        type: raw.type as ForecastType,
        isActive: raw.isActive,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      }),
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
