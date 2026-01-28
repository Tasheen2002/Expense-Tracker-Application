import { FastifyRequest, FastifyReply } from "fastify";
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
    const body = await validateRequest(req, createForecastSchema);
    const command = new CreateForecastCommand(
      body.planId,
      body.name,
      body.type as ForecastType,
    );
    const result = await this.createForecastHandler.handle(command);
    return reply.status(201).send(result);
  }

  async addItem(req: FastifyRequest, reply: FastifyReply) {
    const body = await validateRequest(req, addForecastItemSchema);
    const command = new AddForecastItemCommand(
      body.forecastId,
      body.categoryId,
      body.amount,
      body.notes,
    );
    const result = await this.addForecastItemHandler.handle(command);
    return reply.status(201).send(result);
  }

  async get(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const { id } = req.params;
    const query = new GetForecastQuery(id);
    const result = await this.getForecastHandler.handle(query);
    return reply.send(result);
  }

  async list(
    req: FastifyRequest<{ Params: { planId: string } }>,
    reply: FastifyReply,
  ) {
    const { planId } = req.params;
    const query = new ListForecastsQuery(planId);
    const result = await this.listForecastsHandler.handle(query);
    return reply.send(result);
  }

  async listItems(
    req: FastifyRequest<{ Params: { forecastId: string } }>,
    reply: FastifyReply,
  ) {
    const { forecastId } = req.params;
    const query = new GetForecastItemsQuery(forecastId);
    const result = await this.getForecastItemsHandler.handle(query);
    return reply.send(result);
  }

  async delete(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const { id } = req.params;
    await this.forecastService.deleteForecast(id);
    return reply.status(204).send();
  }

  async deleteItem(
    req: FastifyRequest<{ Params: { itemId: string } }>,
    reply: FastifyReply,
  ) {
    const { itemId } = req.params;
    await this.forecastService.deleteForecastItem(itemId);
    return reply.status(204).send();
  }
}
