import { PrismaClient, Prisma } from "@prisma/client";
import { ForecastItem } from "../../domain/entities/forecast-item.entity";
import { IForecastItemRepository } from "../../domain/repositories/forecast-item.repository";
import { ForecastItemId } from "../../domain/value-objects/forecast-item-id";
import { ForecastId } from "../../domain/value-objects/forecast-id";
import { CategoryId } from '@core/domain/value-objects';
import {
  ForecastNotFoundError,
  ForecastItemNotFoundError,
  ValidationError,
} from "../../domain/errors/budget-planning.errors";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';

export class ForecastItemRepositoryImpl
  implements IForecastItemRepository
{
  protected readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  protected get client(): PrismaClient | Prisma.TransactionClient {
    return PrismaUnitOfWork.getClient(this.prisma);
  }

  async save(item: ForecastItem): Promise<void> {
    const wsId = item.workspaceId.getValue();
    const forecastId = item.forecastId.getValue();
    const id = item.id.getValue();

    // Verify parent forecast exists in the same workspace
    const parentForecast = await this.client.forecast.findFirst({
      where: { id: forecastId, workspaceId: wsId },
      select: { id: true },
    });
    if (!parentForecast) {
      throw new ForecastNotFoundError(forecastId, wsId);
    }

    const existing = await this.client.forecastItem.findUnique({
      where: { id },
      select: { id: true, workspaceId: true, forecastId: true, categoryId: true },
    });

    if (existing) {
      if (existing.workspaceId !== wsId) {
        throw new ValidationError("Cannot update forecast item belonging to another workspace");
      }
      if (existing.forecastId !== forecastId) {
        throw new ValidationError("Cannot reassign forecast item to a different forecast");
      }

      const updateResult = await this.client.forecastItem.updateMany({
        where: { id, workspaceId: wsId },
        data: {
          amount: item.amount.getValue(),
          notes: item.notes,
          updatedAt: item.updatedAt,
        },
      });

      if (updateResult.count === 0) {
        throw new ForecastItemNotFoundError(id, wsId);
      }
    } else {
      await this.client.forecastItem.create({
        data: {
          id,
          workspaceId: wsId,
          forecastId,
          categoryId: item.categoryId.getValue(),
          amount: item.amount.getValue(),
          notes: item.notes,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        },
      });
    }
  }

  async findById(id: ForecastItemId, workspaceId: string): Promise<ForecastItem | null> {
    const raw = await this.client.forecastItem.findFirst({
      where: { id: id.getValue(), workspaceId },
    });

    if (!raw) return null;

    return ForecastItem.fromPersistence({
      id: raw.id,
      workspaceId: raw.workspaceId,
      forecastId: raw.forecastId,
      categoryId: raw.categoryId,
      amount: raw.amount.toNumber(),
      notes: raw.notes,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findByForecastId(
    forecastId: ForecastId,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ForecastItem>> {
    const where: Prisma.ForecastItemWhereInput = {
      forecastId: forecastId.getValue(),
      workspaceId,
    };

    return PrismaRepositoryHelper.paginate(
      this.client.forecastItem,
      { where, orderBy: { createdAt: "desc" } },
      (raw) =>
        ForecastItem.fromPersistence({
          id: raw.id,
          workspaceId: raw.workspaceId,
          forecastId: raw.forecastId,
          categoryId: raw.categoryId,
          amount: raw.amount.toNumber(),
          notes: raw.notes,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        }),
      options,
    );
  }

  async delete(id: ForecastItemId, workspaceId: string): Promise<void> {
    if (!workspaceId || workspaceId.trim() === '') {
      throw new ValidationError('Workspace ID is required for deleting a forecast item');
    }

    const result = await this.client.forecastItem.deleteMany({
      where: { id: id.getValue(), workspaceId },
    });
    if (result.count === 0) {
      throw new ForecastItemNotFoundError(id.getValue(), workspaceId);
    }
  }

  async findByCategory(
    forecastId: ForecastId,
    categoryId: CategoryId,
    workspaceId: string,
  ): Promise<ForecastItem | null> {
    const raw = await this.client.forecastItem.findFirst({
      where: {
        forecastId: forecastId.getValue(),
        categoryId: categoryId.getValue(),
        workspaceId,
      },
    });

    if (!raw) return null;

    return ForecastItem.fromPersistence({
      id: raw.id,
      workspaceId: raw.workspaceId,
      forecastId: raw.forecastId,
      categoryId: raw.categoryId,
      amount: raw.amount.toNumber(),
      notes: raw.notes,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async deleteByForecastId(forecastId: ForecastId, workspaceId: string): Promise<void> {
    if (!workspaceId || workspaceId.trim() === '') {
      throw new ValidationError('Workspace ID is required for deleting forecast items');
    }

    await this.client.forecastItem.deleteMany({
      where: { forecastId: forecastId.getValue(), workspaceId },
    });
  }

  async countByForecastId(forecastId: ForecastId, workspaceId: string): Promise<number> {
    return this.client.forecastItem.count({
      where: { forecastId: forecastId.getValue(), workspaceId },
    });
  }
}
