import { Forecast } from "../../domain/entities/forecast.entity";
import { IForecastRepository } from "../../domain/repositories/forecast.repository";
import { IForecastItemRepository } from "../../domain/repositories/forecast-item.repository";
import { IBudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { ForecastId } from "../../domain/value-objects/forecast-id";
import { ForecastItemId } from "../../domain/value-objects/forecast-item-id";
import { ForecastType } from "../../domain/enums/forecast-type.enum";
import { ForecastItem } from "../../domain/entities/forecast-item.entity";
import { CategoryId } from "../../../expense-ledger";
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
    private readonly forecastRepository: IForecastRepository,
    private readonly forecastItemRepository: IForecastItemRepository,
    private readonly budgetPlanRepository: IBudgetPlanRepository,
    private readonly workspaceAccess: IWorkspaceAccessPort,
  ) {}

  private async checkPlanAccess(
    userId: string,
    planId: PlanId,
    workspaceId: string,
    action: string,
  ): Promise<void> {
    const plan = await this.budgetPlanRepository.findById(planId, workspaceId);
    if (!plan) {
      throw new BudgetPlanNotFoundError(planId.getValue());
    }

    const isCreator = plan.createdBy.getValue() === userId;
    const isAdminOrOwner = await this.workspaceAccess.isAdminOrOwner(
      userId,
      plan.workspaceId.getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedBudgetPlanAccessError(action);
    }
  }

  async createForecast(params: {
    planId: string;
    workspaceId: string;
    name: string;
    type: ForecastType;
    userId: string;
  }): Promise<Forecast> {
    const planId = PlanId.fromString(params.planId);

    // Check access to the plan before creating forecast
    await this.checkPlanAccess(params.userId, planId, params.workspaceId, "create forecast");

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
    workspaceId: string;
    categoryId: string;
    amount: number;
    notes?: string;
    userId: string;
  }): Promise<ForecastItem> {
    const forecastId = ForecastId.fromString(params.forecastId);
    const categoryId = CategoryId.fromString(params.categoryId);

    const forecast = await this.forecastRepository.findById(forecastId, params.workspaceId);
    if (!forecast) {
      throw new ForecastNotFoundError(params.forecastId);
    }

    // Check access to the parent plan
    await this.checkPlanAccess(
      params.userId,
      forecast.planId,
      params.workspaceId,
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
    workspaceId: string;
    amount?: number;
    notes?: string;
    userId: string;
  }): Promise<ForecastItem> {
    const itemId = ForecastItemId.fromString(params.itemId);
    const item = await this.forecastItemRepository.findById(itemId, params.workspaceId);

    if (!item) {
      throw new ForecastItemNotFoundError(params.itemId);
    }

    // Traverse up: Item -> Forecast -> Plan -> Check Access
    const forecast = await this.forecastRepository.findById(
      item.forecastId,
      params.workspaceId,
    );
    if (!forecast)
      throw new ForecastNotFoundError(item.forecastId.getValue());

    await this.checkPlanAccess(
      params.userId,
      forecast.planId,
      params.workspaceId,
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

  async deleteForecastItem(itemId: string, workspaceId: string, userId: string): Promise<void> {
    const id = ForecastItemId.fromString(itemId);
    const item = await this.forecastItemRepository.findById(id, workspaceId);
    if (!item) {
      throw new ForecastItemNotFoundError(itemId);
    }

    const forecast = await this.forecastRepository.findById(
      item.forecastId,
      workspaceId,
    );
    if (!forecast)
      throw new ForecastNotFoundError(item.forecastId.getValue());

    await this.checkPlanAccess(
      userId,
      forecast.planId,
      workspaceId,
      "delete forecast item",
    );

    await this.forecastItemRepository.delete(id);
  }

  async deleteForecast(id: string, workspaceId: string, userId: string): Promise<void> {
    const forecastId = ForecastId.fromString(id);
    const forecast = await this.forecastRepository.findById(forecastId, workspaceId);
    if (!forecast) {
      throw new ForecastNotFoundError(id);
    }

    await this.checkPlanAccess(userId, forecast.planId, workspaceId, "delete forecast");

    // Use transactional delete to ensure data integrity
    await this.forecastRepository.deleteWithItems(forecastId);
  }
}
