import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';
import { CreateScenarioHandler } from '../../../application/commands/create-scenario.command';
import { UpdateScenarioHandler } from '../../../application/commands/update-scenario.command';
import { DeleteScenarioHandler } from '../../../application/commands/delete-scenario.command';
import { GetScenarioHandler } from '../../../application/queries/get-scenario.query';
import { ListScenariosHandler } from '../../../application/queries/list-scenarios.query';

export class ScenarioController {
  constructor(
    private readonly createScenarioHandler: CreateScenarioHandler,
    private readonly updateScenarioHandler: UpdateScenarioHandler,
    private readonly deleteScenarioHandler: DeleteScenarioHandler,
    private readonly getScenarioHandler: GetScenarioHandler,
    private readonly listScenariosHandler: ListScenariosHandler
  ) {}

  async create(
    req: AuthenticatedRequest<{
      Params: { workspaceId: string; planId: string };
      Body: {
        name: string;
        description?: string;
        assumptions?: Record<string, unknown>;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      const { workspaceId, planId } = req.params;
      const result = await this.createScenarioHandler.handle({
        name: req.body.name,
        planId,
        workspaceId,
        createdBy: userId,
        description: req.body.description,
        assumptions: req.body.assumptions,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Scenario created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async get(
    req: AuthenticatedRequest<{ Params: { workspaceId: string; id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      const { workspaceId, id } = req.params;
      const scenario = await this.getScenarioHandler.handle({ id, workspaceId, userId });
      return ResponseHelper.ok(reply, 'Scenario retrieved successfully', scenario);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async list(
    req: AuthenticatedRequest<{ Params: { workspaceId: string; planId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      const { workspaceId, planId } = req.params;
      const result = await this.listScenariosHandler.handle({ planId, workspaceId, userId });
      return ResponseHelper.ok(reply, 'Scenarios retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async update(
    req: AuthenticatedRequest<{
      Params: { workspaceId: string; id: string };
      Body: {
        name?: string;
        description?: string;
        assumptions?: Record<string, unknown>;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      const { workspaceId, id } = req.params;
      const result = await this.updateScenarioHandler.handle({
        id,
        workspaceId,
        userId,
        name: req.body.name,
        description: req.body.description,
        assumptions: req.body.assumptions,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Scenario updated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async delete(
    req: AuthenticatedRequest<{ Params: { workspaceId: string; id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      const { workspaceId, id } = req.params;
      const result = await this.deleteScenarioHandler.handle({ id, workspaceId, userId });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Scenario deleted successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
