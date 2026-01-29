import { FastifyRequest, FastifyReply } from "fastify";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";
import {
  CreateForecastHandler,
  CreateForecastCommand,
} from "../../../application/commands/create-forecast.command";
import {
  AddForecastItemHandler,
  AddForecastItemCommand,
} from "../../../application/commands/add-forecast-item.command";
import {
  GetForecastHandler,
  GetForecastQuery,
} from "../../../application/queries/get-forecast.query";
import {
  ListForecastsHandler,
  ListForecastsQuery,
} from "../../../application/queries/list-forecasts.query";
import {
  GetForecastItemsHandler,
  GetForecastItemsQuery,
} from "../../../application/queries/get-forecast-items.query";
import { ForecastService } from "../../../application/services/forecast.service";
import { validateRequest } from "../validation/validator";
import {
  createForecastSchema,
  addForecastItemSchema,
} from "../validation/forecast.schema";

import { ForecastType } from "../../../domain/enums/forecast-type.enum";

export class ForecastController {
  constructor(
    private readonly createForecastHandler: CreateForecastHandler,
    private readonly addForecastItemHandler: AddForecastItemHandler,
    private readonly getForecastHandler: GetForecastHandler,
    private readonly listForecastsHandler: ListForecastsHandler,
    private readonly getForecastItemsHandler: GetForecastItemsHandler,
    private readonly forecastService: ForecastService,
  ) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "User not authenticated" });
      }
      const body = await validateRequest(req, createForecastSchema);
      const command = new CreateForecastCommand(
        body.planId,
        body.name,
        body.type as ForecastType,
      );
      const result = await this.createForecastHandler.handle(command);
      return ResponseHelper.success(
        reply,
        201,
        "Forecast created successfully",
        result,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async addItem(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "User not authenticated" });
      }
      const body = await validateRequest(req, addForecastItemSchema);
      const command = new AddForecastItemCommand(
        body.forecastId,
        body.categoryId,
        body.amount,
        body.notes,
      );
      const result = await this.addForecastItemHandler.handle(command);
      return ResponseHelper.success(
        reply,
        201,
        "Forecast item added successfully",
        result,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async get(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "User not authenticated" });
      }
      const { id } = req.params;
      const query = new GetForecastQuery(id);
      const result = await this.getForecastHandler.handle(query);
      return ResponseHelper.success(
        reply,
        200,
        "Forecast retrieved successfully",
        result,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async list(
    req: FastifyRequest<{ Params: { planId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "User not authenticated" });
      }
      const { planId } = req.params;
      const query = new ListForecastsQuery(planId);
      const result = await this.listForecastsHandler.handle(query);
      return ResponseHelper.success(
        reply,
        200,
        "Forecasts retrieved successfully",
        result,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listItems(
    req: FastifyRequest<{ Params: { forecastId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "User not authenticated" });
      }
      const { forecastId } = req.params;
      const query = new GetForecastItemsQuery(forecastId);
      const result = await this.getForecastItemsHandler.handle(query);
      return ResponseHelper.success(
        reply,
        200,
        "Forecast items retrieved successfully",
        result,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async delete(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "User not authenticated" });
      }
      const { id } = req.params;
      await this.forecastService.deleteForecast(id);
      return ResponseHelper.success(
        reply,
        200,
        "Forecast deleted successfully",
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteItem(
    req: FastifyRequest<{ Params: { itemId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "User not authenticated" });
      }
      const { itemId } = req.params;
      await this.forecastService.deleteForecastItem(itemId);
      return ResponseHelper.success(
        reply,
        200,
        "Forecast item deleted successfully",
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
