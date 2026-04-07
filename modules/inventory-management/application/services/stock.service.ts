import { IStockRepository } from '../../domain/repositories/stock.repository';
import { IInventoryTransactionRepository } from '../../domain/repositories/inventory-transaction.repository';
import { ILocationRepository } from '../../domain/repositories/location.repository';
import { Stock } from '../../domain/entities/stock.entity';
import { InventoryTransaction } from '../../domain/entities/inventory-transaction.entity';
import { StockId } from '../../domain/value-objects/stock-id.vo';
import { LocationId } from '../../domain/value-objects/location-id.vo';
import { TransactionType } from '../../domain/enums/transaction-type';
import {
  StockNotFoundError,
  LocationNotFoundError,
} from '../../domain/errors/inventory.errors';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export class StockService {
  constructor(
    private readonly stockRepository: IStockRepository,
    private readonly transactionRepository: IInventoryTransactionRepository,
    private readonly locationRepository: ILocationRepository
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
  }): Promise<{ stock: Stock; transaction: InventoryTransaction }> {
    // Verify location exists
    const locationExists = await this.locationRepository.exists(
      LocationId.fromString(params.locationId),
      params.workspaceId
    );
    if (!locationExists) {
      throw new LocationNotFoundError(params.locationId, params.workspaceId);
    }

    // Find or create stock record
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

    // Apply stock change based on transaction type
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
        stock.removeQuantity(params.quantity);
        break;
    }

    await this.stockRepository.save(stock);

    // Record the transaction
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

    await this.transactionRepository.save(transaction);

    return { stock, transaction };
  }

  async getStockByVariantAndLocation(
    variantId: string,
    locationId: string,
    workspaceId: string
  ): Promise<Stock | null> {
    return this.stockRepository.findByVariantAndLocation(
      variantId,
      locationId,
      workspaceId
    );
  }

  async getStockByLocation(
    locationId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Stock>> {
    return this.stockRepository.findByLocation(locationId, workspaceId, options);
  }

  async getStockByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Stock>> {
    return this.stockRepository.findByWorkspace(workspaceId, options);
  }

  async getTransactionsByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<InventoryTransaction>> {
    return this.transactionRepository.findByWorkspace(workspaceId, options);
  }

  async updateStockSettings(
    stockId: string,
    workspaceId: string,
    updates: {
      reorderLevel?: number;
      reorderQuantity?: number;
    }
  ): Promise<Stock> {
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
    return stock;
  }
}
