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
import { CategoryId, WorkspaceId } from '@core/domain/value-objects';
import { ForecastAmount } from "../../domain/value-objects/forecast-amount";
import { PlanStatus } from "../../domain/enums/plan-status.enum";
import { PLANNING_CONSTANTS } from "../../domain/constants/planning.constants";
import {
  ForecastNotFoundError,
  DuplicateForecastNameError,
  DuplicateForecastItemError,
  ForecastItemNotFoundError,
  BudgetPlanNotFoundError,
  UnauthorizedBudgetPlanAccessError,
  MaxForecastsExceededError,
  MaxForecastItemsExceededError,
  PlanNotModifiableError,
} from "../../domain/errors/budget-planning.errors";
import { IWorkspaceAccessPort } from "../../domain/ports/workspace-access.port";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { IUnitOfWork } from '@shared/application/ports/unit-of-work.port';

export class ForecastService {
  constructor(
    private readonly forecastRepository: IForecastRepository,
    private readonly forecastItemRepository: IForecastItemRepository,
    private readonly budgetPlanRepository: IBudgetPlanRepository,
    private readonly workspaceAccess: IWorkspaceAccessPort,
    private readonly unitOfWork?: IUnitOfWork,
  ) {}

  private async checkPlanAccess(
    userId: string,
    planId: PlanId,
    workspaceId: string,
    action: string,
  ): Promise<BudgetPlan> {
    const plan = await this.budgetPlanRepository.findById(planId, workspaceId);
    if (!plan) {
      throw new BudgetPlanNotFoundError(planId.getValue(), workspaceId);
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
    const plan = await this.checkPlanAccess(
      params.userId,
      planId,
      params.workspaceId,
      "create forecast",
    );

    if (plan.status === PlanStatus.ARCHIVED) {
      throw new PlanNotModifiableError(plan.id.getValue(), plan.status, 'create forecasts in');
    }

    const forecastCount = await this.forecastRepository.countByPlanId(planId, params.workspaceId);
    if (forecastCount >= PLANNING_CONSTANTS.MAX_FORECASTS_PER_PLAN) {
      throw new MaxForecastsExceededError(planId.getValue(), PLANNING_CONSTANTS.MAX_FORECASTS_PER_PLAN);
    }

    const existing = await this.forecastRepository.findByName(
      planId,
      params.name,
      params.workspaceId,
    );
    if (existing) {
      throw new DuplicateForecastNameError(params.name);
    }

    const forecast = Forecast.create({
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      planId,
      name: params.name,
      type: params.type,
    });

    const executeCreate = async () => {
      await this.forecastRepository.save(forecast);
      plan.recordForecastCreated(forecast.id.getValue(), forecast.name);
      await this.budgetPlanRepository.save(plan);
    };

    if (this.unitOfWork) {
      await this.unitOfWork.execute(executeCreate);
    } else {
      await executeCreate();
    }

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
      throw new ForecastNotFoundError(params.forecastId, params.workspaceId);
    }

    // Check access to the parent plan
    const plan = await this.checkPlanAccess(
      params.userId,
      forecast.planId,
      params.workspaceId,
      "add forecast item",
    );

    if (plan.status === PlanStatus.ARCHIVED) {
      throw new PlanNotModifiableError(plan.id.getValue(), plan.status, 'add forecast items to');
    }

    const itemCount = await this.forecastItemRepository.countByForecastId(forecastId, params.workspaceId);
    if (itemCount >= PLANNING_CONSTANTS.MAX_ITEMS_PER_FORECAST) {
      throw new MaxForecastItemsExceededError(forecastId.getValue(), PLANNING_CONSTANTS.MAX_ITEMS_PER_FORECAST);
    }

    const existingItem = await this.forecastItemRepository.findByCategory(
      forecastId,
      categoryId,
      params.workspaceId,
    );
    if (existingItem) {
      throw new DuplicateForecastItemError(params.categoryId);
    }

    const item = ForecastItem.create({
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      forecastId,
      categoryId,
      amount: ForecastAmount.create(params.amount),
      notes: params.notes,
    });

    const executeAdd = async () => {
      await this.forecastItemRepository.save(item);
      plan.recordForecastItemCreated(forecast.id.getValue(), item.id.getValue());
      await this.budgetPlanRepository.save(plan);
    };

    if (this.unitOfWork) {
      await this.unitOfWork.execute(executeAdd);
    } else {
      await executeAdd();
    }

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
      throw new ForecastItemNotFoundError(params.itemId, params.workspaceId);
    }

    // Traverse up: Item -> Forecast -> Plan -> Check Access
    const forecast = await this.forecastRepository.findById(
      item.forecastId,
      params.workspaceId,
    );
    if (!forecast)
      throw new ForecastNotFoundError(item.forecastId.getValue(), params.workspaceId);

    const plan = await this.checkPlanAccess(
      params.userId,
      forecast.planId,
      params.workspaceId,
      "update forecast item",
    );

    if (plan.status === PlanStatus.ARCHIVED) {
      throw new PlanNotModifiableError(plan.id.getValue(), plan.status, 'update forecast items in');
    }

    const amount =
      params.amount !== undefined
        ? ForecastAmount.create(params.amount)
        : undefined;
    item.updateDetails(amount, params.notes);

    const executeUpdate = async () => {
      await this.forecastItemRepository.save(item);
      plan.recordForecastItemUpdated(forecast.id.getValue(), item.id.getValue());
      await this.budgetPlanRepository.save(plan);
    };

    if (this.unitOfWork) {
      await this.unitOfWork.execute(executeUpdate);
    } else {
      await executeUpdate();
    }

    return ForecastItem.toDTO(item);
  }

  async deleteForecastItem(itemId: string, workspaceId: string, userId: string): Promise<void> {
    const id = ForecastItemId.fromString(itemId);
    const item = await this.forecastItemRepository.findById(id, workspaceId);
    if (!item) {
      throw new ForecastItemNotFoundError(itemId, workspaceId);
    }

    const forecast = await this.forecastRepository.findById(
      item.forecastId,
      workspaceId,
    );
    if (!forecast)
      throw new ForecastNotFoundError(item.forecastId.getValue(), workspaceId);

    const plan = await this.checkPlanAccess(
      userId,
      forecast.planId,
      workspaceId,
      "delete forecast item",
    );

    if (plan.status === PlanStatus.ARCHIVED) {
      throw new PlanNotModifiableError(plan.id.getValue(), plan.status, 'delete forecast items from');
    }

    const executeDelete = async () => {
      await this.forecastItemRepository.delete(id, workspaceId);
      plan.recordForecastItemDeleted(item.forecastId.getValue(), itemId);
      await this.budgetPlanRepository.save(plan);
    };

    if (this.unitOfWork) {
      await this.unitOfWork.execute(executeDelete);
    } else {
      await executeDelete();
    }
  }

  async deleteForecast(id: string, workspaceId: string, userId: string): Promise<void> {
    const forecastId = ForecastId.fromString(id);
    const forecast = await this.forecastRepository.findById(forecastId, workspaceId);
    if (!forecast) {
      throw new ForecastNotFoundError(id, workspaceId);
    }

    const plan = await this.checkPlanAccess(userId, forecast.planId, workspaceId, "delete forecast");

    if (plan.status === PlanStatus.ARCHIVED) {
      throw new PlanNotModifiableError(plan.id.getValue(), plan.status, 'delete forecasts from');
    }

    const executeDelete = async () => {
      // Delete child first in transaction
      await this.forecastRepository.deleteWithItems(forecastId, workspaceId);
      // Record and dispatch domain event on aggregate root
      plan.recordForecastDeleted(forecastId.getValue());
      await this.budgetPlanRepository.save(plan);
    };

    if (this.unitOfWork) {
      await this.unitOfWork.execute(executeDelete);
    } else {
      await executeDelete();
    }
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
      throw new ForecastNotFoundError(forecastId, workspaceId);
    }
    const result = await this.forecastItemRepository.findByForecastId(
      ForecastId.fromString(forecastId),
      workspaceId,
      options,
    );
    return { ...result, items: result.items.map((item) => ForecastItem.toDTO(item)) };
  }
}
