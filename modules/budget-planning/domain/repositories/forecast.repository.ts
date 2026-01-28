import { Forecast } from "../entities/forecast.entity";
import { ForecastId } from "../value-objects/forecast-id";
import { PlanId } from "../value-objects/plan-id";

export interface ForecastRepository {
  save(forecast: Forecast): Promise<void>;
  findById(id: ForecastId): Promise<Forecast | null>;
  findByPlanId(planId: PlanId): Promise<Forecast[]>;
  delete(id: ForecastId): Promise<void>;

  deleteWithItems(id: ForecastId): Promise<void>;
  findByName(planId: PlanId, name: string): Promise<Forecast | null>;
}
