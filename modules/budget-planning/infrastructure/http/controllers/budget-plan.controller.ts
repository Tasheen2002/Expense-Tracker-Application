import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateBudgetPlanHandler } from '../../../application/commands/create-budget-plan.command';
import { UpdateBudgetPlanHandler } from '../../../application/commands/update-budget-plan.command';
import { ActivateBudgetPlanHandler } from '../../../application/commands/activate-budget-plan.command';
import { DeleteBudgetPlanHandler } from '../../../application/commands/delete-budget-plan.command';
import { GetBudgetPlanHandler } from '../../../application/queries/get-budget-plan.query';
import { ListBudgetPlansHandler } from '../../../application/queries/list-budget-plans.query';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';
import { validateRequest } from '../validation/validator';
import {
  createBudgetPlanSchema,
  updateBudgetPlanSchema,
  listBudgetPlansSchema,
} from '../validation/budget-planning.schema';
import { PlanStatus } from '../../../domain/enums/plan-status.enum';

export class BudgetPlanController {
  constructor(
    private readonly createHandler: CreateBudgetPlanHandler,
    private readonly updateHandler: UpdateBudgetPlanHandler,
    private readonly activateHandler: ActivateBudgetPlanHandler,
    private readonly deleteHandler: DeleteBudgetPlanHandler,
    private readonly getHandler: GetBudgetPlanHandler,
    private readonly listHandler: ListBudgetPlansHandler
  ) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }
      const body = await validateRequest(req, createBudgetPlanSchema);
      const result = await this.createHandler.handle({
        workspaceId: body.workspaceId,
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        createdBy: userId,
        description: body.description,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Budget plan created successfully',
        result.data,
        201
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async update(
    req: AuthenticatedRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = req.params;
      const body = await validateRequest(req, updateBudgetPlanSchema);
      const userId = req.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }
      const result = await this.updateHandler.handle({
        id,
        userId,
        name: body.name,
        description: body.description,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Budget plan updated successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activate(
    req: AuthenticatedRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }
      const result = await this.activateHandler.handle({ id, userId });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Budget plan activated successfully'
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
      const result = await this.getHandler.handle({ id, userId });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Budget plan retrieved successfully',
        result.data?.toJSON()
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async list(
    req: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        status?: string;
        limit?: string;
        offset?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }
      const { workspaceId } = req.params;
      const result = await this.listHandler.handle({
        userId,
        workspaceId,
        status: req.query.status as PlanStatus,
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0,
      });
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Budget plans retrieved successfully',
        result.data
          ? {
              items: result.data.items.map((plan) => plan.toJSON()),
              pagination: {
                total: result.data.total,
                limit: result.data.limit,
                offset: result.data.offset,
                hasMore: result.data.hasMore,
              },
            }
          : undefined
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
      const { id } = req.params;
      const userId = req.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }
      const result = await this.deleteHandler.handle({ id, userId });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Budget plan deleted successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}

