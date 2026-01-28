import { Forecast } from "../../domain/entities/forecast.entity";
import { ForecastRepository } from "../../domain/repositories/forecast.repository";
import { ForecastItemRepository } from "../../domain/repositories/forecast-item.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { ForecastId } from "../../domain/value-objects/forecast-id";
import { ForecastType } from "../../domain/enums/forecast-type.enum";
import { ForecastItem } from "../../domain/entities/forecast-item.entity";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import { ForecastAmount } from "../../domain/value-objects/forecast-amount";
import {
  ForecastNotFoundError,
  DuplicateForecastNameError,
  DuplicateForecastItemError,
  ForecastItemNotFoundError,
} from "../../domain/errors/budget-planning.errors";

export class ForecastService {
  constructor(
    private readonly forecastRepository: ForecastRepository,
    private readonly forecastItemRepository: ForecastItemRepository,
  ) {}

  async createForecast(params: {
    planId: string;
    name: string;
    type: ForecastType;
  }): Promise<Forecast> {
    const planId = PlanId.fromString(params.planId);

    const existing = await this.forecastRepository.findByName(
      planId,
      params.name,
    );
    if (existing) {
      throw new DuplicateForecastNameError(params.name);
    }

    const forecast = Forecast.create({
      planId,
      name: params.name,
      type: params.type,
    });

    await this.forecastRepository.save(forecast);
    return forecast;
  }

  async addForecastItem(params: {
    forecastId: string;
    categoryId: string;
    amount: number;
    notes?: string;
  }): Promise<ForecastItem> {
    const forecastId = ForecastId.fromString(params.forecastId);
    const categoryId = CategoryId.fromString(params.categoryId);

    const forecast = await this.forecastRepository.findById(forecastId);
    if (!forecast) {
      throw new ForecastNotFoundError(params.forecastId);
    }

    const existingItem = await this.forecastItemRepository.findByCategory(
      forecastId,
      categoryId,
    );
    if (existingItem) {
      throw new DuplicateForecastItemError(params.categoryId);
    }

    const item = ForecastItem.create({
      forecastId,
      categoryId,
      amount: ForecastAmount.create(params.amount),
      notes: params.notes,
    });

    await this.forecastItemRepository.save(item);
    return item;
  }

  async updateForecastItem(params: {
    itemId: string;
    amount?: number;
    notes?: string;
  }): Promise<ForecastItem> {
    const itemId =
      require("../../domain/value-objects/forecast-item-id").ForecastItemId.fromString(
        params.itemId,
      );
    const item = await this.forecastItemRepository.findById(itemId);

    if (!item) {
      throw new ForecastItemNotFoundError(params.itemId);
    }

    const amount =
      params.amount !== undefined
        ? ForecastAmount.create(params.amount)
        : undefined;
    item.updateDetails(amount, params.notes);

    await this.forecastItemRepository.save(item);
    return item;
  }

  async deleteForecastItem(itemId: string): Promise<void> {
    const id =
      require("../../domain/value-objects/forecast-item-id").ForecastItemId.fromString(
        itemId,
      );
    await this.forecastItemRepository.delete(id);
  }

  async getForecast(id: string): Promise<Forecast> {
    const forecastId = ForecastId.fromString(id);
    const forecast = await this.forecastRepository.findById(forecastId);
    if (!forecast) {
      throw new ForecastNotFoundError(id);
    }
    return forecast;
  }

  async listForecasts(planId: string): Promise<Forecast[]> {
    return this.forecastRepository.findByPlanId(PlanId.fromString(planId));
  }

  async getForecastItems(forecastId: string): Promise<ForecastItem[]> {
    return this.forecastItemRepository.findByForecastId(
      ForecastId.fromString(forecastId),
    );
  }

  async deleteForecast(id: string): Promise<void> {
    const forecastId = ForecastId.fromString(id);
    const forecast = await this.forecastRepository.findById(forecastId);
    if (!forecast) {
      throw new ForecastNotFoundError(id);
    }

    // Cascade delete items first (though database cascade might handle this, explicit is safer for domain logic)
    await this.forecastItemRepository.deleteByForecastId(forecastId);
    await this.forecastRepository.delete(forecastId);
  }
}
