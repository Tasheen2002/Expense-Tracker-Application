import { FastifyRequest, FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
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

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const userId = req.user.userId;
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
        {
          id: result.getId().getValue(),
          planId: result.getPlanId().getValue(),
          name: result.getName(),
          type: result.getType(),
          isActive: result.getIsActive(),
          createdAt: result.getCreatedAt().toISOString(),
          updatedAt: result.getUpdatedAt().toISOString(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async addItem(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const userId = req.user.userId;
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
        {
          id: result.getId().getValue(),
          forecastId: result.getForecastId().getValue(),
          categoryId: result.getCategoryId().getValue(),
          amount: result.getAmount().toNumber(),
          notes: result.getNotes(),
          createdAt: result.getCreatedAt().toISOString(),
          updatedAt: result.getUpdatedAt().toISOString(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async get(
    req: AuthenticatedRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = req.user.userId;
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
        {
          id: result.getId().getValue(),
          planId: result.getPlanId().getValue(),
          name: result.getName(),
          type: result.getType(),
          isActive: result.getIsActive(),
          createdAt: result.getCreatedAt().toISOString(),
          updatedAt: result.getUpdatedAt().toISOString(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async list(
    req: AuthenticatedRequest<{ Params: { planId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = req.user.userId;
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
        result.map((f) => ({
          id: f.getId().getValue(),
          planId: f.getPlanId().getValue(),
          name: f.getName(),
          type: f.getType(),
          isActive: f.getIsActive(),
          createdAt: f.getCreatedAt().toISOString(),
          updatedAt: f.getUpdatedAt().toISOString(),
        })),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listItems(
    req: AuthenticatedRequest<{ Params: { forecastId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = req.user.userId;
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
        result.map((item) => ({
          id: item.getId().getValue(),
          forecastId: item.getForecastId().getValue(),
          categoryId: item.getCategoryId().getValue(),
          amount: item.getAmount().toNumber(),
          notes: item.getNotes(),
          createdAt: item.getCreatedAt().toISOString(),
          updatedAt: item.getUpdatedAt().toISOString(),
        })),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async delete(
    req: AuthenticatedRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = req.user.userId;
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
    req: AuthenticatedRequest<{ Params: { itemId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = req.user.userId;
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
