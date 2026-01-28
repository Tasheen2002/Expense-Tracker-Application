import { ForecastItem } from "../entities/forecast-item.entity";
import { ForecastItemId } from "../value-objects/forecast-item-id";
import { ForecastId } from "../value-objects/forecast-id";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";

export interface ForecastItemRepository {
  save(item: ForecastItem): Promise<void>;
  findById(id: ForecastItemId): Promise<ForecastItem | null>;
  findByForecastId(forecastId: ForecastId): Promise<ForecastItem[]>;
  delete(id: ForecastItemId): Promise<void>;
  findByCategory(
    forecastId: ForecastId,
    categoryId: CategoryId,
  ): Promise<ForecastItem | null>;
  deleteByForecastId(forecastId: ForecastId): Promise<void>;
}
