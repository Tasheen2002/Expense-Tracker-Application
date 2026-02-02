import { Forecast } from "../../domain/entities/forecast.entity";
import { ForecastRepository } from "../../domain/repositories/forecast.repository";
import { ForecastItemRepository } from "../../domain/repositories/forecast-item.repository";
import { BudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { ForecastId } from "../../domain/value-objects/forecast-id";
import { ForecastItemId } from "../../domain/value-objects/forecast-item-id";
import { ForecastType } from "../../domain/enums/forecast-type.enum";
import { ForecastItem } from "../../domain/entities/forecast-item.entity";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import { ForecastAmount } from "../../domain/value-objects/forecast-amount";
import {
  ForecastNotFoundError,
  DuplicateForecastNameError,
  DuplicateForecastItemError,
  ForecastItemNotFoundError,
  BudgetPlanNotFoundError,
  UnauthorizedBudgetPlanAccessError,
} from "../../domain/errors/budget-planning.errors";
import { IWorkspaceAccessPort } from "../../domain/ports/workspace-access.port";

export class ForecastService {
  constructor(
    private readonly forecastRepository: ForecastRepository,
    private readonly forecastItemRepository: ForecastItemRepository,
    private readonly budgetPlanRepository: BudgetPlanRepository,
    private readonly workspaceAccess: IWorkspaceAccessPort,
  ) {}

  private async checkPlanAccess(
    userId: string,
    planId: PlanId,
    action: string,
  ): Promise<void> {
    const plan = await this.budgetPlanRepository.findById(planId);
    if (!plan) {
      throw new BudgetPlanNotFoundError(planId.toString());
    }

    const isCreator = plan.getCreatedBy().getValue() === userId;
    const isAdminOrOwner = await this.workspaceAccess.isAdminOrOwner(
      userId,
      plan.getWorkspaceId().getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedBudgetPlanAccessError(action);
    }
  }

  async createForecast(params: {
    planId: string;
    name: string;
    type: ForecastType;
    userId: string;
  }): Promise<Forecast> {
    const planId = PlanId.fromString(params.planId);

    // Check access to the plan before creating forecast
    await this.checkPlanAccess(params.userId, planId, "create forecast");

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
    userId: string;
  }): Promise<ForecastItem> {
    const forecastId = ForecastId.fromString(params.forecastId);
    const categoryId = CategoryId.fromString(params.categoryId);

    const forecast = await this.forecastRepository.findById(forecastId);
    if (!forecast) {
      throw new ForecastNotFoundError(params.forecastId);
    }

    // Check access to the parent plan
    await this.checkPlanAccess(
      params.userId,
      forecast.getPlanId(),
      "add forecast item",
    );

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
    userId: string;
  }): Promise<ForecastItem> {
    const itemId = ForecastItemId.fromString(params.itemId);
    const item = await this.forecastItemRepository.findById(itemId);

    if (!item) {
      throw new ForecastItemNotFoundError(params.itemId);
    }

    // Need to find forecast then plan?
    // Or we assume if they can get the item ID they might be authorized?
    // No, strictly we should traverse up.
    // Item -> Forecast -> Plan -> Check Access.
    // This is expensive but secure.
    // Optimization: Store WorkspaceId on Forecast/Item? No, normalization is better.

    // For now, let's just implement the traversal if needed, OR
    // we can rely on the fact that `ForecastItem` doesn't link back to `Forecast` easily without a repository call.
    // We don't have `findByItemId` on ForecastRepo.

    // We can fetch forecast by item.getForecastId()
    const forecast = await this.forecastRepository.findById(
      item.getForecastId(),
    );
    if (!forecast)
      throw new ForecastNotFoundError(item.getForecastId().toString()); // Should not happen

    await this.checkPlanAccess(
      params.userId,
      forecast.getPlanId(),
      "update forecast item",
    );

    const amount =
      params.amount !== undefined
        ? ForecastAmount.create(params.amount)
        : undefined;
    item.updateDetails(amount, params.notes);

    await this.forecastItemRepository.save(item);
    return item;
  }

  async deleteForecastItem(itemId: string, userId: string): Promise<void> {
    const id = ForecastItemId.fromString(itemId);
    const item = await this.forecastItemRepository.findById(id);
    if (!item) {
      throw new ForecastItemNotFoundError(itemId);
    }

    const forecast = await this.forecastRepository.findById(
      item.getForecastId(),
    );
    if (!forecast)
      throw new ForecastNotFoundError(item.getForecastId().toString());

    await this.checkPlanAccess(
      userId,
      forecast.getPlanId(),
      "delete forecast item",
    );

    await this.forecastItemRepository.delete(id);
  }

  async getForecast(id: string, userId: string): Promise<Forecast> {
    const forecastId = ForecastId.fromString(id);
    const forecast = await this.forecastRepository.findById(forecastId);
    if (!forecast) {
      throw new ForecastNotFoundError(id);
    }

    await this.checkPlanAccess(userId, forecast.getPlanId(), "view forecast");

    return forecast;
  }

  async listForecasts(planId: string, userId: string): Promise<Forecast[]> {
    const pId = PlanId.fromString(planId);
    await this.checkPlanAccess(userId, pId, "list forecasts");

    return this.forecastRepository.findByPlanId(pId);
  }

  async getForecastItems(
    forecastId: string,
    userId: string,
  ): Promise<ForecastItem[]> {
    const fId = ForecastId.fromString(forecastId);
    const forecast = await this.forecastRepository.findById(fId);
    if (!forecast) {
      throw new ForecastNotFoundError(forecastId);
    }

    await this.checkPlanAccess(
      userId,
      forecast.getPlanId(),
      "view forecast items",
    );

    return this.forecastItemRepository.findByForecastId(fId);
  }

  async deleteForecast(id: string, userId: string): Promise<void> {
    const forecastId = ForecastId.fromString(id);
    const forecast = await this.forecastRepository.findById(forecastId);
    if (!forecast) {
      throw new ForecastNotFoundError(id);
    }

    await this.checkPlanAccess(userId, forecast.getPlanId(), "delete forecast");

    // Use transactional delete to ensure data integrity
    await this.forecastRepository.deleteWithItems(forecastId);
  }
}
