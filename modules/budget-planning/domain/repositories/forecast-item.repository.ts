import { ForecastItem } from "../entities/forecast-item.entity";
import { ForecastItemId } from "../value-objects/forecast-item-id";
import { ForecastId } from "../value-objects/forecast-id";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ForecastItemRepository {
  save(item: ForecastItem): Promise<void>;
  findById(id: ForecastItemId): Promise<ForecastItem | null>;
  findByForecastId(
    forecastId: ForecastId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ForecastItem>>;
  delete(id: ForecastItemId): Promise<void>;
  findByCategory(
    forecastId: ForecastId,
    categoryId: CategoryId,
  ): Promise<ForecastItem | null>;
  deleteByForecastId(forecastId: ForecastId): Promise<void>;
}
