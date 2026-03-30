import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';
import { CreateScenarioHandler } from '../../../application/commands/create-scenario.command';
import { DeleteScenarioHandler } from '../../../application/commands/delete-scenario.command';
import { GetScenarioHandler } from '../../../application/queries/get-scenario.query';
import { ListScenariosHandler } from '../../../application/queries/list-scenarios.query';

export class ScenarioController {
  constructor(
    private readonly createScenarioHandler: CreateScenarioHandler,
    private readonly deleteScenarioHandler: DeleteScenarioHandler,
    private readonly getScenarioHandler: GetScenarioHandler,
    private readonly listScenariosHandler: ListScenariosHandler
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
        description?: string;
        assumptions?: Record<string, any>;
      };
      const result = await this.createScenarioHandler.handle({
        name: body.name,
        planId: planId,
        createdBy: userId,
        description: body.description,
        assumptions: body.assumptions,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Scenario created successfully',
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
      const result = await this.getScenarioHandler.handle({ id, userId });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Scenario retrieved successfully',
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
      const result = await this.listScenariosHandler.handle({ planId, userId });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Scenarios retrieved successfully',
        result.data?.items.map((s) => s.toJSON())
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
      const result = await this.deleteScenarioHandler.handle({ id, userId });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Scenario deleted successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
