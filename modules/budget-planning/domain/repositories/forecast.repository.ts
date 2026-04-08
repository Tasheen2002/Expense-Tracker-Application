import { Forecast } from "../entities/forecast.entity";
import { ForecastId } from "../value-objects/forecast-id";
import { PlanId } from "../value-objects/plan-id";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface IForecastRepository {
  save(forecast: Forecast): Promise<void>;
  findById(id: ForecastId, workspaceId: string): Promise<Forecast | null>;
  findByPlanId(
    planId: PlanId,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Forecast>>;
  delete(id: ForecastId): Promise<void>;

  deleteWithItems(id: ForecastId): Promise<void>;
  findByName(planId: PlanId, name: string): Promise<Forecast | null>;
}
