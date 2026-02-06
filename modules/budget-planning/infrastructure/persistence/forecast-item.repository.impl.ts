import { PrismaClient, Prisma } from "@prisma/client";
import { ForecastItem } from "../../domain/entities/forecast-item.entity";
import { ForecastItemRepository } from "../../domain/repositories/forecast-item.repository";
import { ForecastItemId } from "../../domain/value-objects/forecast-item-id";
import { ForecastId } from "../../domain/value-objects/forecast-id";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";
import { PrismaRepository } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";

export class ForecastItemRepositoryImpl
  extends PrismaRepository<ForecastItem>
  implements ForecastItemRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(item: ForecastItem): Promise<void> {
    const data = {
      id: item.getId().getValue(),
      forecastId: item.getForecastId().getValue(),
      categoryId: item.getCategoryId().getValue(),
      amount: item.getAmount().getValue(),
      notes: item.getNotes(),
      createdAt: item.getCreatedAt(),
      updatedAt: item.getUpdatedAt(),
    };

    await this.prisma.forecastItem.upsert({
      where: { id: item.getId().getValue() },
      update: data,
      create: data,
    });

    await this.dispatchEvents(item);
  }

  async findById(id: ForecastItemId): Promise<ForecastItem | null> {
    const raw = await this.prisma.forecastItem.findUnique({
      where: { id: id.getValue() },
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
