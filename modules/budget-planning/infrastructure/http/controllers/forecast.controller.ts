import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';
import {
  CreateForecastHandler,
  AddForecastItemHandler,
  DeleteForecastHandler,
  DeleteForecastItemHandler,
  GetForecastHandler,
  ListForecastsHandler,
  GetForecastItemsHandler,
} from '../../../application';
import { ForecastType } from '../../../domain/enums/forecast-type.enum';
import {
  PlanIdParams,
  ForecastParams,
  ForecastIdParams,
  ForecastItemParams,
  CreateForecastBody,
  AddForecastItemBody,
} from '../validation/budget-planning.schema';

export class ForecastController {
  constructor(
    private readonly createForecastHandler: CreateForecastHandler,
    private readonly addForecastItemHandler: AddForecastItemHandler,
    private readonly deleteForecastHandler: DeleteForecastHandler,
    private readonly deleteForecastItemHandler: DeleteForecastItemHandler,
    private readonly getForecastHandler: GetForecastHandler,
    private readonly listForecastsHandler: ListForecastsHandler,
    private readonly getForecastItemsHandler: GetForecastItemsHandler
  ) {}

  async get(
    req: AuthenticatedRequest<{ Params: ForecastParams }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      const { workspaceId, id } = req.params;
      const forecast = await this.getForecastHandler.handle({ id, workspaceId, userId });
      return ResponseHelper.ok(reply, 'Forecast retrieved successfully', forecast);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async list(
    req: AuthenticatedRequest<{ Params: PlanIdParams }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      const { workspaceId, planId } = req.params;
      const result = await this.listForecastsHandler.handle({ planId, workspaceId, userId });
      return ResponseHelper.ok(reply, 'Forecasts retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listItems(
    req: AuthenticatedRequest<{ Params: ForecastIdParams }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      const { forecastId, workspaceId } = req.params;
      const result = await this.getForecastItemsHandler.handle({
        forecastId,
        workspaceId,
        userId,
      });
      return ResponseHelper.ok(reply, 'Forecast items retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async create(
    req: AuthenticatedRequest<{
      Params: PlanIdParams;
      Body: CreateForecastBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      const { workspaceId, planId } = req.params;
      const result = await this.createForecastHandler.handle({
        planId,
        workspaceId,
        name: req.body.name,
        type: req.body.type as ForecastType,
        userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Forecast created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async addItem(
    req: AuthenticatedRequest<{
      Params: ForecastIdParams;
      Body: AddForecastItemBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      const { workspaceId, forecastId } = req.params;
      const result = await this.addForecastItemHandler.handle({
        forecastId,
        workspaceId,
        categoryId: req.body.categoryId,
        amount: req.body.amount,
        userId,
        notes: req.body.notes,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Forecast item added successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async delete(
    req: AuthenticatedRequest<{ Params: ForecastParams }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      const { workspaceId, id } = req.params;
      const result = await this.deleteForecastHandler.handle({ id, workspaceId, userId });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Forecast deleted successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteItem(
    req: AuthenticatedRequest<{ Params: ForecastItemParams }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      const { workspaceId, itemId } = req.params;
      const result = await this.deleteForecastItemHandler.handle({
        itemId,
        workspaceId,
        userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Forecast item deleted successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
