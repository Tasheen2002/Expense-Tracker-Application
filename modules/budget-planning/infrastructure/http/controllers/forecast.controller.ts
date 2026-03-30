import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';
import { CreateForecastHandler } from '../../../application/commands/create-forecast.command';
import { AddForecastItemHandler } from '../../../application/commands/add-forecast-item.command';
import {
  DeleteForecastHandler,
  DeleteForecastItemHandler,
} from '../../../application/commands/delete-forecast.command';
import { GetForecastHandler } from '../../../application/queries/get-forecast.query';
import { ListForecastsHandler } from '../../../application/queries/list-forecasts.query';
import { GetForecastItemsHandler } from '../../../application/queries/get-forecast-items.query';

import { ForecastType } from '../../../domain/enums/forecast-type.enum';

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

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }
      const { planId } = req.params as { planId: string };
      const body = req.body as {
        name: string;
        type: string;
      };
      const result = await this.createForecastHandler.handle({
        planId,
        name: body.name,
        type: body.type as ForecastType,
        userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Forecast created successfully',
        result.data,
        201
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async addItem(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }
      const { forecastId } = req.params as { forecastId: string };
      const body = req.body as {
        categoryId: string;
        amount: number;
        notes?: string;
      };
      const result = await this.addForecastItemHandler.handle({
        forecastId,
        categoryId: body.categoryId,
        amount: body.amount,
        userId,
        notes: body.notes,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Forecast item added successfully',
        result.data,
        201
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async get(
    req: AuthenticatedRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }
      const { id } = req.params;
      const result = await this.getForecastHandler.handle({ id, userId });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Forecast retrieved successfully',
        result.data?.toJSON()
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async list(
    req: AuthenticatedRequest<{ Params: { planId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }
      const { planId } = req.params;
      const result = await this.listForecastsHandler.handle({ planId, userId });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Forecasts retrieved successfully',
        result.data?.items.map((f) => f.toJSON())
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listItems(
    req: AuthenticatedRequest<{ Params: { forecastId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }
      const { forecastId } = req.params;
      const result = await this.getForecastItemsHandler.handle({
        forecastId,
        userId,
      });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Forecast items retrieved successfully',
        result.data?.items.map((item) => item.toJSON())
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async delete(
    req: AuthenticatedRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }
      const { id } = req.params;
      const result = await this.deleteForecastHandler.handle({ id, userId });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Forecast deleted successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteItem(
    req: AuthenticatedRequest<{ Params: { itemId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }
      const { itemId } = req.params;
      const result = await this.deleteForecastItemHandler.handle({
        itemId,
        userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Forecast item deleted successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
