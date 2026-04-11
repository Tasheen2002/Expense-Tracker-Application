import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { CreateBudgetPlanHandler } from '../../../application/commands/create-budget-plan.command';
import { UpdateBudgetPlanHandler } from '../../../application/commands/update-budget-plan.command';
import { ActivateBudgetPlanHandler } from '../../../application/commands/activate-budget-plan.command';
import { DeleteBudgetPlanHandler } from '../../../application/commands/delete-budget-plan.command';
import { GetBudgetPlanHandler } from '../../../application/queries/get-budget-plan.query';
import { ListBudgetPlansHandler } from '../../../application/queries/list-budget-plans.query';
import { ResponseHelper } from '@shared/response.helper';
import { PlanStatus } from '../../../domain/enums/plan-status.enum';
import { PeriodType } from '../../../domain/enums/period-type.enum';

export class BudgetPlanController {
  constructor(
    private readonly createHandler: CreateBudgetPlanHandler,
    private readonly updateHandler: UpdateBudgetPlanHandler,
    private readonly activateHandler: ActivateBudgetPlanHandler,
    private readonly deleteHandler: DeleteBudgetPlanHandler,
    private readonly getHandler: GetBudgetPlanHandler,
    private readonly listHandler: ListBudgetPlansHandler
  ) {}

  async create(
    req: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        name: string;
        description?: string;
        periodType: string;
        startDate: string;
        endDate: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = req.user.userId;
      const { workspaceId } = req.params;
      const result = await this.createHandler.handle({
        workspaceId,
        name: req.body.name,
        periodType: req.body.periodType as PeriodType,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        createdBy: userId,
        description: req.body.description,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Budget plan created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async update(
    req: AuthenticatedRequest<{
      Params: { workspaceId: string; id: string };
      Body: {
        name?: string;
        description?: string | null;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, id } = req.params;
      const userId = req.user.userId;
      const result = await this.updateHandler.handle({
        id,
        workspaceId,
        userId,
        name: req.body.name,
        description: req.body.description ?? undefined,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Budget plan updated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activate(
    req: AuthenticatedRequest<{ Params: { workspaceId: string; id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, id } = req.params;
      const userId = req.user.userId;
      const result = await this.activateHandler.handle({
        id,
        workspaceId,
        userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Budget plan activated successfully'
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
      const plan = await this.getHandler.handle({ id, workspaceId, userId });
      return ResponseHelper.ok(
        reply,
        'Budget plan retrieved successfully',
        plan
      );
    } catch (error: unknown) {
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
      const { workspaceId } = req.params;
      const { status, limit, offset } = req.query;
      const result = await this.listHandler.handle({
        userId,
        workspaceId,
        status: status as PlanStatus | undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
      return ResponseHelper.ok(
        reply,
        'Budget plans retrieved successfully',
        result
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
      const { workspaceId, id } = req.params;
      const userId = req.user.userId;
      const result = await this.deleteHandler.handle({
        id,
        workspaceId,
        userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Budget plan deleted successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
