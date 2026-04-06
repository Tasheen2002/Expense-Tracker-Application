import { PrismaClient, Prisma } from "@prisma/client";
import { ForecastItem } from "../../domain/entities/forecast-item.entity";
import { IForecastItemRepository } from "../../domain/repositories/forecast-item.repository";
import { ForecastItemId } from "../../domain/value-objects/forecast-item-id";
import { ForecastId } from "../../domain/value-objects/forecast-id";
import { CategoryId } from "../../../expense-ledger";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';

export class ForecastItemRepositoryImpl
  extends PrismaRepository<ForecastItem>
  implements IForecastItemRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(item: ForecastItem): Promise<void> {
    const data = {
      id: item.id.getValue(),
      forecastId: item.forecastId.getValue(),
      categoryId: item.categoryId.getValue(),
      amount: item.amount.getValue(),
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };

    await this.prisma.forecastItem.upsert({
      where: { id: item.id.getValue() },
      update: data,
      create: data,
    });

    await this.dispatchEvents(item);
  }

  async findById(id: ForecastItemId, workspaceId: string): Promise<ForecastItem | null> {
    const raw = await this.prisma.forecastItem.findFirst({
      where: { id: id.getValue(), forecast: { plan: { workspaceId } } },
    });

    if (!raw) return null;

    return ForecastItem.reconstitute({
      id: raw.id,
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
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ForecastItem>> {
    const where: Prisma.ForecastItemWhereInput = {
      forecastId: forecastId.getValue(),
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.forecastItem,
      { where, orderBy: { createdAt: "desc" } },
      (raw) =>
        ForecastItem.reconstitute({
          id: raw.id,
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

  async delete(id: ForecastItemId): Promise<void> {
    await this.prisma.forecastItem.delete({
      where: { id: id.getValue() },
    });
  }

  async findByCategory(
    forecastId: ForecastId,
    categoryId: CategoryId,
  ): Promise<ForecastItem | null> {
    const raw = await this.prisma.forecastItem.findFirst({
      where: {
        forecastId: forecastId.getValue(),
        categoryId: categoryId.getValue(),
      },
    });

    if (!raw) return null;

    return ForecastItem.reconstitute({
      id: raw.id,
      forecastId: raw.forecastId,
      categoryId: raw.categoryId,
      amount: raw.amount.toNumber(),
      notes: raw.notes,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async deleteByForecastId(forecastId: ForecastId): Promise<void> {
    await this.prisma.forecastItem.deleteMany({
      where: { forecastId: forecastId.getValue() },
    });
  }
}
