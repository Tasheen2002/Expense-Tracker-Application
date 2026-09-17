import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  CreateBudgetPlanHandler,
  UpdateBudgetPlanHandler,
  ActivateBudgetPlanHandler,
  DeleteBudgetPlanHandler,
  GetBudgetPlanHandler,
  ListBudgetPlansHandler,
} from '../../../application';
import { ResponseHelper } from '@shared/response.helper';
import { PlanStatus } from '../../../domain/enums/plan-status.enum';
import { PeriodType } from '../../../domain/enums/period-type.enum';
import {
  WorkspaceParams,
  PlanParams,
  CreateBudgetPlanBody,
  UpdateBudgetPlanBody,
  BudgetPlanQuery,
} from '../validation/budget-planning.schema';

export class BudgetPlanController {
  constructor(
    private readonly createHandler: CreateBudgetPlanHandler,
    private readonly updateHandler: UpdateBudgetPlanHandler,
    private readonly activateHandler: ActivateBudgetPlanHandler,
    private readonly deleteHandler: DeleteBudgetPlanHandler,
    private readonly getHandler: GetBudgetPlanHandler,
    private readonly listHandler: ListBudgetPlansHandler
  ) {}

  async get(
    req: AuthenticatedRequest<{ Params: PlanParams }>,
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
      Params: WorkspaceParams;
      Querystring: BudgetPlanQuery;
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
        limit,
        offset,
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

  async create(
    req: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Body: CreateBudgetPlanBody;
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
      Params: PlanParams;
      Body: UpdateBudgetPlanBody;
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
    req: AuthenticatedRequest<{ Params: PlanParams }>,
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

  async delete(
    req: AuthenticatedRequest<{ Params: PlanParams }>,
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
