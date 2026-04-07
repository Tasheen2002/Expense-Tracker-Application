import { Stock } from '../entities/stock.entity';
import { StockId } from '../value-objects/stock-id.vo';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface IStockRepository {
  save(stock: Stock): Promise<void>;
  findById(id: StockId, workspaceId: string): Promise<Stock | null>;
  findByVariantAndLocation(
    variantId: string,
    locationId: string,
    workspaceId: string
  ): Promise<Stock | null>;
  findByLocation(
    locationId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Stock>>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Stock>>;
  delete(id: StockId, workspaceId: string): Promise<void>;
}
