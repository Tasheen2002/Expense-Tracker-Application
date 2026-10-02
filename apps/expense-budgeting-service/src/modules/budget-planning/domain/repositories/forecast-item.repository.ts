import { ForecastItem } from "../entities/forecast-item.entity";
import { ForecastItemId } from "../value-objects/forecast-item-id";
import { ForecastId } from "../value-objects/forecast-id";
import {  CategoryId  } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IForecastItemRepository {
  save(item: ForecastItem): Promise<void>;
  findById(id: ForecastItemId, workspaceId: string): Promise<ForecastItem | null>;
  findByForecastId(
    forecastId: ForecastId,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ForecastItem>>;
  delete(id: ForecastItemId, workspaceId: string): Promise<void>;
  findByCategory(
    forecastId: ForecastId,
    categoryId: CategoryId,
    workspaceId: string,
  ): Promise<ForecastItem | null>;
  deleteByForecastId(forecastId: ForecastId, workspaceId: string): Promise<void>;
  countByForecastId(forecastId: ForecastId, workspaceId: string): Promise<number>;
}
