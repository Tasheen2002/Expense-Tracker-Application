import { FastifyRequest, FastifyReply } from "fastify";
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
    const body = await validateRequest(req, createScenarioSchema);
    const command = new CreateScenarioCommand(
      body.planId,
      body.name,
      body.createdBy,
      body.description,
      body.assumptions,
    );
    const result = await this.createScenarioHandler.handle(command);
    return reply.status(201).send(result);
  }

  async get(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const { id } = req.params;
    const result = await this.scenarioService.getScenario(id);
    return reply.send(result);
  }

  async list(
    req: FastifyRequest<{ Params: { planId: string } }>,
    reply: FastifyReply,
  ) {
    const { planId } = req.params;
    const result = await this.scenarioService.listScenarios(planId);
    return reply.send(result);
  }

  async delete(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const { id } = req.params;
    await this.scenarioService.deleteScenario(id);
    return reply.status(204).send();
  }
}
