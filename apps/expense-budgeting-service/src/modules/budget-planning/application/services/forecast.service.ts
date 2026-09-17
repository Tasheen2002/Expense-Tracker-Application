import { Forecast, ForecastDTO } from "../../domain/entities/forecast.entity";
import { BudgetPlan } from "../../domain/entities/budget-plan.entity";
import { IForecastRepository } from "../../domain/repositories/forecast.repository";
import { IForecastItemRepository } from "../../domain/repositories/forecast-item.repository";
import { IBudgetPlanRepository } from "../../domain/repositories/budget-plan.repository";
import { PlanId } from "../../domain/value-objects/plan-id";
import { ForecastId } from "../../domain/value-objects/forecast-id";
import { ForecastItemId } from "../../domain/value-objects/forecast-item-id";
import { ForecastType } from "../../domain/enums/forecast-type.enum";
import { ForecastItem, ForecastItemDTO } from "../../domain/entities/forecast-item.entity";
import {  CategoryId  } from '@core/domain/value-objects';
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
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

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
  ): Promise<BudgetPlan> {
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

    return plan;
  }

  async createForecast(params: {
    planId: string;
    workspaceId: string;
    name: string;
    type: ForecastType;
    userId: string;
  }): Promise<ForecastDTO> {
    const planId = PlanId.fromString(params.planId);

    // Check access to the plan before creating forecast
    const plan = await this.checkPlanAccess(params.userId, planId, params.workspaceId, "create forecast");

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

    plan.recordForecastCreated(forecast.id.getValue(), forecast.name);
    await this.budgetPlanRepository.save(plan);

    return Forecast.toDTO(forecast);
  }

  async addForecastItem(params: {
    forecastId: string;
    workspaceId: string;
    categoryId: string;
    amount: number;
    notes?: string;
    userId: string;
  }): Promise<ForecastItemDTO> {
    const forecastId = ForecastId.fromString(params.forecastId);
    const categoryId = CategoryId.fromString(params.categoryId);

    const forecast = await this.forecastRepository.findById(forecastId, params.workspaceId);
    if (!forecast) {
      throw new ForecastNotFoundError(params.forecastId);
    }

    // Check access to the parent plan
    const plan = await this.checkPlanAccess(
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

    plan.recordForecastItemUpdated(forecast.id.getValue(), item.id.getValue());
    await this.budgetPlanRepository.save(plan);

    return ForecastItem.toDTO(item);
  }

  async updateForecastItem(params: {
    itemId: string;
    workspaceId: string;
    amount?: number;
    notes?: string;
    userId: string;
  }): Promise<ForecastItemDTO> {
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

    const plan = await this.checkPlanAccess(
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

    plan.recordForecastItemUpdated(forecast.id.getValue(), item.id.getValue());
    await this.budgetPlanRepository.save(plan);

    return ForecastItem.toDTO(item);
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

    const plan = await this.checkPlanAccess(
      userId,
      forecast.planId,
      workspaceId,
      "delete forecast item",
    );

    plan.recordForecastItemDeleted(item.forecastId.getValue(), itemId);
    await this.budgetPlanRepository.save(plan);
    await this.forecastItemRepository.delete(id);
  }

  async deleteForecast(id: string, workspaceId: string, userId: string): Promise<void> {
    const forecastId = ForecastId.fromString(id);
    const forecast = await this.forecastRepository.findById(forecastId, workspaceId);
    if (!forecast) {
      throw new ForecastNotFoundError(id);
    }

    const plan = await this.checkPlanAccess(userId, forecast.planId, workspaceId, "delete forecast");

    plan.recordForecastDeleted(forecastId.getValue());
    await this.budgetPlanRepository.save(plan);

    // Use transactional delete to ensure data integrity
    await this.forecastRepository.deleteWithItems(forecastId);
  }

  async getForecastById(id: string, workspaceId: string): Promise<ForecastDTO | null> {
    const forecast = await this.forecastRepository.findById(ForecastId.fromString(id), workspaceId);
    return forecast ? Forecast.toDTO(forecast) : null;
  }

  async getForecastsByPlan(
    planId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ForecastDTO>> {
    const result = await this.forecastRepository.findByPlanId(
      PlanId.fromString(planId),
      workspaceId,
      options,
    );
    return { ...result, items: result.items.map((f) => Forecast.toDTO(f)) };
  }

  async getForecastItemsByForecast(
    forecastId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ForecastItemDTO>> {
    const forecast = await this.forecastRepository.findById(
      ForecastId.fromString(forecastId),
      workspaceId,
    );
    if (!forecast) {
      throw new ForecastNotFoundError(forecastId);
    }
    const result = await this.forecastItemRepository.findByForecastId(
      ForecastId.fromString(forecastId),
      options,
    );
    return { ...result, items: result.items.map((item) => ForecastItem.toDTO(item)) };
  }
}
