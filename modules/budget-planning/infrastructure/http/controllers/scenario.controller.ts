import { FastifyRequest, FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
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

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const userId = req.user.userId;
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
        {
          id: result.getId().getValue(),
          planId: result.getPlanId().getValue(),
          name: result.getName(),
          description: result.getDescription(),
          assumptions: result.getAssumptions(),
          createdBy: result.getCreatedBy().getValue(),
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
      const result = await this.scenarioService.getScenario(id, userId);
      return ResponseHelper.success(
        reply,
        200,
        "Scenario retrieved successfully",
        {
          id: result.getId().getValue(),
          planId: result.getPlanId().getValue(),
          name: result.getName(),
          description: result.getDescription(),
          assumptions: result.getAssumptions(),
          createdBy: result.getCreatedBy().getValue(),
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
      const result = await this.scenarioService.listScenarios(planId, userId);
      return ResponseHelper.success(
        reply,
        200,
        "Scenarios retrieved successfully",
        result.map((s) => ({
          id: s.getId().getValue(),
          planId: s.getPlanId().getValue(),
          name: s.getName(),
          description: s.getDescription(),
          assumptions: s.getAssumptions(),
          createdBy: s.getCreatedBy().getValue(),
          createdAt: s.getCreatedAt().toISOString(),
          updatedAt: s.getUpdatedAt().toISOString(),
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
      await this.scenarioService.deleteScenario(id, userId);
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
