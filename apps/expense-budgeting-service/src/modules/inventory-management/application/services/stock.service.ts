import { IStockRepository } from '../../domain/repositories/stock.repository';
import { IInventoryTransactionRepository } from '../../domain/repositories/inventory-transaction.repository';
import { ILocationRepository } from '../../domain/repositories/location.repository';
import { Stock, StockDTO } from '../../domain/entities/stock.entity';
import { InventoryTransaction, InventoryTransactionDTO } from '../../domain/entities/inventory-transaction.entity';
import { StockId } from '../../domain/value-objects/stock-id.vo';
import { LocationId } from '../../domain/value-objects/location-id.vo';
import { TransactionType } from '../../domain/enums/transaction-type';
import { IUnitOfWork } from '@shared/application/ports/unit-of-work.port';
import { IInventoryWriteLock } from '../ports/inventory-write-lock.port';
import {
  StockNotFoundError,
  LocationNotFoundError,
  LocationInactiveError,
  InvalidInventoryDataError,
} from '../../domain/errors/inventory.errors';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class StockService {
  constructor(
    private readonly stockRepository: IStockRepository,
    private readonly transactionRepository: IInventoryTransactionRepository,
    private readonly locationRepository: ILocationRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly writeLock: IInventoryWriteLock
  ) {}

  async adjustStock(params: {
    workspaceId: string;
    variantId: string;
    locationId: string;
    quantity: number;
    type: TransactionType;
    notes?: string;
    referenceId?: string;
    referenceType?: string;
    createdBy: string;
  }): Promise<{ stock: StockDTO; transaction: InventoryTransactionDTO }> {
    return this.unitOfWork.execute(async () => {
      await this.writeLock.acquire(params.workspaceId);
      const location = await this.locationRepository.findById(
        LocationId.fromString(params.locationId),
        params.workspaceId
      );
      if (!location) {
        throw new LocationNotFoundError(params.locationId, params.workspaceId);
      }
      if (!location.isActive) {
        throw new LocationInactiveError(params.locationId);
      }

      let stock = await this.stockRepository.findByVariantAndLocation(
        params.variantId,
        params.locationId,
        params.workspaceId
      );
      if (!stock) {
        stock = Stock.create({
          workspaceId: params.workspaceId,
          variantId: params.variantId,
          locationId: params.locationId,
        });
      }

      switch (params.type) {
        case TransactionType.IN:
          stock.addQuantity(params.quantity);
          break;
        case TransactionType.OUT:
          stock.removeQuantity(params.quantity);
          break;
        case TransactionType.ADJUSTMENT:
          stock.adjustQuantity(params.quantity);
          break;
        case TransactionType.TRANSFER:
          throw new InvalidInventoryDataError(
            'Transfer requires a destination location and an atomic two-location operation'
          );
        default:
          throw new InvalidInventoryDataError('Invalid stock transaction type');
      }

      const transaction = InventoryTransaction.create({
        workspaceId: params.workspaceId,
        variantId: params.variantId,
        locationId: params.locationId,
        type: params.type,
        quantity: params.quantity,
        referenceId: params.referenceId,
        referenceType: params.referenceType,
        notes: params.notes,
        createdBy: params.createdBy,
      });

      await this.stockRepository.save(stock);
      await this.transactionRepository.save(transaction);

      return {
        stock: Stock.toDTO(stock),
        transaction: InventoryTransaction.toDTO(transaction),
      };
    });
  }

  async getStockByVariantAndLocation(
    variantId: string,
    locationId: string,
    workspaceId: string
  ): Promise<StockDTO | null> {
    const stock = await this.stockRepository.findByVariantAndLocation(
      variantId,
      locationId,
      workspaceId
    );
    return stock ? Stock.toDTO(stock) : null;
  }

  async getStockByLocation(
    locationId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<StockDTO>> {
    const result = await this.stockRepository.findByLocation(locationId, workspaceId, options);
    return {
      items: result.items.map((s) => Stock.toDTO(s)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
  }

  async getStockByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<StockDTO>> {
    const result = await this.stockRepository.findByWorkspace(workspaceId, options);
    return {
      items: result.items.map((s) => Stock.toDTO(s)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
  }

  async getTransactionsByFilters(
    filters: { workspaceId: string; variantId?: string; locationId?: string },
    options?: PaginationOptions
  ): Promise<PaginatedResult<InventoryTransactionDTO>> {
    const result = await this.transactionRepository.findByFilters(filters, options);
    return {
      items: result.items.map((t) => InventoryTransaction.toDTO(t)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
  }

  async updateStockSettings(
    stockId: string,
    workspaceId: string,
    updates: {
      reorderLevel?: number;
      reorderQuantity?: number;
    }
  ): Promise<StockDTO> {
    return this.unitOfWork.execute(async () => {
      await this.writeLock.acquire(workspaceId);
      const stock = await this.stockRepository.findById(
        StockId.fromString(stockId),
        workspaceId
      );
      if (!stock) {
        throw new StockNotFoundError(stockId, workspaceId);
      }

      if (updates.reorderLevel !== undefined) {
        stock.updateReorderLevel(updates.reorderLevel);
      }
      if (updates.reorderQuantity !== undefined) {
        stock.updateReorderQuantity(updates.reorderQuantity);
      }

      await this.stockRepository.save(stock);
      return Stock.toDTO(stock);
    });
  }
}
