import { PrismaClient, Prisma } from '@prisma/client';
import { Stock } from '../../domain/entities/stock.entity';
import { StockId } from '../../domain/value-objects/stock-id.vo';
import { IStockRepository } from '../../domain/repositories/stock.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';

export class StockRepositoryImpl
  extends PrismaRepository<Stock>
  implements IStockRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(stock: Stock): Promise<void> {
    await this.prisma.stock.upsert({
      where: { id: stock.id.getValue() },
      create: {
        id: stock.id.getValue(),
        workspaceId: stock.workspaceId,
        variantId: stock.variantId,
        locationId: stock.locationId,
        quantity: stock.quantity,
        reservedQuantity: stock.reservedQuantity,
        reorderLevel: stock.reorderLevel,
        reorderQuantity: stock.reorderQuantity,
        createdAt: stock.createdAt,
        updatedAt: stock.updatedAt,
      },
      update: {
        quantity: stock.quantity,
        reservedQuantity: stock.reservedQuantity,
        reorderLevel: stock.reorderLevel,
        reorderQuantity: stock.reorderQuantity,
        updatedAt: stock.updatedAt,
      },
    });

    await this.dispatchEvents(stock);
  }

  async findById(id: StockId, workspaceId: string): Promise<Stock | null> {
    const row = await this.prisma.stock.findFirst({
      where: { id: id.getValue(), workspaceId },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByVariantAndLocation(
    variantId: string,
    locationId: string,
    workspaceId: string
  ): Promise<Stock | null> {
    const row = await this.prisma.stock.findFirst({
      where: { variantId, locationId, workspaceId },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByLocation(
    locationId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Stock>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.stock,
      { where: { locationId, workspaceId }, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Stock>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.stock,
      { where: { workspaceId }, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async delete(id: StockId, workspaceId: string): Promise<void> {
    await this.prisma.stock.delete({
      where: { id: id.getValue(), workspaceId },
    });
  }

  private toDomain(row: Prisma.StockGetPayload<object>): Stock {
    return Stock.fromPersistence({
      id: StockId.fromString(row.id),
      workspaceId: row.workspaceId,
      variantId: row.variantId,
      locationId: row.locationId,
      quantity: row.quantity,
      reservedQuantity: row.reservedQuantity,
      reorderLevel: row.reorderLevel,
      reorderQuantity: row.reorderQuantity,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
