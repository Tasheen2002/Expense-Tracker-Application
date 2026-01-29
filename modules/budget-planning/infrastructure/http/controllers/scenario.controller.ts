import { FastifyRequest, FastifyReply } from "fastify";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";
import {
  CreateScenarioHandler,
  CreateScenarioCommand,
} from "../../../application/commands/create-scenario.command";
import { ScenarioService } from "../../../application/services/scenario.service";
import { validateRequest } from "../validation/validator";
import { createScenarioSchema } from "../validation/scenario.schema";

export class ScenarioController {
  constructor(
    private readonly createScenarioHandler: CreateScenarioHandler,
    private readonly scenarioService: ScenarioService,
  ) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "User not authenticated" });
      }
      const body = await validateRequest(req, createScenarioSchema);
      const command = new CreateScenarioCommand(
        body.planId,
        body.name,
        userId,
        body.description,
        body.assumptions,
      );
      const result = await this.createScenarioHandler.handle(command);
      return ResponseHelper.success(
        reply,
        201,
        "Scenario created successfully",
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
      const result = await this.scenarioService.getScenario(id);
      return ResponseHelper.success(
        reply,
        200,
        "Scenario retrieved successfully",
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
      const result = await this.scenarioService.listScenarios(planId);
      return ResponseHelper.success(
        reply,
        200,
        "Scenarios retrieved successfully",
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
      await this.scenarioService.deleteScenario(id);
      return ResponseHelper.success(
        reply,
        200,
        "Scenario deleted successfully",
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
