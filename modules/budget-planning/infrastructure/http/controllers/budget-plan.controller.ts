import { FastifyRequest, FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import {
  CreateBudgetPlanHandler,
  CreateBudgetPlanCommand,
} from "../../../application/commands/create-budget-plan.command";
import {
  UpdateBudgetPlanHandler,
  UpdateBudgetPlanCommand,
} from "../../../application/commands/update-budget-plan.command";
import {
  ActivateBudgetPlanHandler,
  ActivateBudgetPlanCommand,
} from "../../../application/commands/activate-budget-plan.command";
import {
  GetBudgetPlanHandler,
  GetBudgetPlanQuery,
} from "../../../application/queries/get-budget-plan.query";
import {
  ListBudgetPlansHandler,
  ListBudgetPlansQuery,
} from "../../../application/queries/list-budget-plans.query";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";
import { BudgetPlanService } from "../../../application/services/budget-plan.service";
import { validateRequest } from "../validation/validator";
import {
  createBudgetPlanSchema,
  updateBudgetPlanSchema,
  listBudgetPlansSchema,
} from "../validation/budget-plan.schema";
import { PlanStatus } from "../../../domain/enums/plan-status.enum";

export class BudgetPlanController {
  constructor(
    private readonly createHandler: CreateBudgetPlanHandler,
    private readonly updateHandler: UpdateBudgetPlanHandler,
    private readonly activateHandler: ActivateBudgetPlanHandler,
    private readonly getHandler: GetBudgetPlanHandler,
    private readonly listHandler: ListBudgetPlansHandler,
    private readonly budgetPlanService: BudgetPlanService, // For delete directly if no command
  ) {}

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }
      const body = await validateRequest(req, createBudgetPlanSchema);
      const command = new CreateBudgetPlanCommand(
        body.workspaceId,
        body.name,
        new Date(body.startDate),
        new Date(body.endDate),
        userId,
        body.description,
      );
      const result = await this.createHandler.handle(command);
      return ResponseHelper.success(
        reply,
        201,
        "Budget plan created successfully",
        {
          id: result.getId().getValue(),
          workspaceId: result.getWorkspaceId().getValue(),
          name: result.getName(),
          description: result.getDescription(),
          period: {
            startDate: result.getPeriod().getStartDate().toISOString(),
            endDate: result.getPeriod().getEndDate().toISOString(),
          },
          status: result.getStatus(),
          createdBy: result.getCreatedBy().getValue(),
          createdAt: result.getCreatedAt().toISOString(),
          updatedAt: result.getUpdatedAt().toISOString(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async update(
    req: AuthenticatedRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const { id } = req.params;
      const body = await validateRequest(req, updateBudgetPlanSchema);
      const userId = req.user.userId;
      if (!userId) {
        return reply.status(401).send({ message: "User not authenticated" });
      }
      const command = new UpdateBudgetPlanCommand(
        id,
        userId,
        body.name,
        body.description,
      );
      const result = await this.updateHandler.handle(command);
      return ResponseHelper.success(
        reply,
        200,
        "Budget plan updated successfully",
        {
          id: result.getId().getValue(),
          workspaceId: result.getWorkspaceId().getValue(),
          name: result.getName(),
          description: result.getDescription(),
          period: {
            startDate: result.getPeriod().getStartDate().toISOString(),
            endDate: result.getPeriod().getEndDate().toISOString(),
          },
          status: result.getStatus(),
          createdBy: result.getCreatedBy().getValue(),
          createdAt: result.getCreatedAt().toISOString(),
          updatedAt: result.getUpdatedAt().toISOString(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activate(
    req: AuthenticatedRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      if (!userId) {
        return reply.status(401).send({ message: "User not authenticated" });
      }
      const command = new ActivateBudgetPlanCommand(id, userId);
      const result = await this.activateHandler.handle(command);
      return ResponseHelper.success(
        reply,
        200,
        "Budget plan activated successfully",
        {
          id: result.getId().getValue(),
          workspaceId: result.getWorkspaceId().getValue(),
          name: result.getName(),
          description: result.getDescription(),
          period: {
            startDate: result.getPeriod().getStartDate().toISOString(),
            endDate: result.getPeriod().getEndDate().toISOString(),
          },
          status: result.getStatus(),
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
      const query = new GetBudgetPlanQuery(id, userId);
      const result = await this.getHandler.handle(query);
      return ResponseHelper.success(
        reply,
        200,
        "Budget plan retrieved successfully",
        {
          id: result.getId().getValue(),
          workspaceId: result.getWorkspaceId().getValue(),
          name: result.getName(),
          description: result.getDescription(),
          period: {
            startDate: result.getPeriod().getStartDate().toISOString(),
            endDate: result.getPeriod().getEndDate().toISOString(),
          },
          status: result.getStatus(),
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
    req: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        status?: string;
        limit?: string;
        offset?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return reply.status(401).send({ message: "User not authenticated" });
      }
      const { workspaceId } = req.params;
      const query = new ListBudgetPlansQuery(
        userId,
        workspaceId,
        req.query.status as PlanStatus,
        req.query.limit ? parseInt(req.query.limit) : 50,
        req.query.offset ? parseInt(req.query.offset) : 0,
      );
      const result = await this.listHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Budget plans retrieved successfully",
        {
          items: result.items.map((plan) => ({
            id: plan.getId().getValue(),
            workspaceId: plan.getWorkspaceId().getValue(),
            name: plan.getName(),
            description: plan.getDescription(),
            period: {
              startDate: plan.getPeriod().getStartDate().toISOString(),
              endDate: plan.getPeriod().getEndDate().toISOString(),
            },
            status: plan.getStatus(),
            createdBy: plan.getCreatedBy().getValue(),
            createdAt: plan.getCreatedAt().toISOString(),
            updatedAt: plan.getUpdatedAt().toISOString(),
          })),
          pagination: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            hasMore: result.hasMore,
          },
        },
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
      const { id } = req.params;
      const userId = req.user.userId;
      if (!userId) {
        return reply.status(401).send({ message: "User not authenticated" });
      }
      await this.budgetPlanService.deletePlan(id, userId);
      return ResponseHelper.success(
        reply,
        200,
        "Budget plan deleted successfully",
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
