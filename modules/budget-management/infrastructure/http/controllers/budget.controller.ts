import { FastifyRequest, FastifyReply } from "fastify";
import { CreateBudgetHandler } from "../../../application/commands/create-budget.command";
import { UpdateBudgetHandler } from "../../../application/commands/update-budget.command";
import { DeleteBudgetHandler } from "../../../application/commands/delete-budget.command";
import { ActivateBudgetHandler } from "../../../application/commands/activate-budget.command";
import { ArchiveBudgetHandler } from "../../../application/commands/archive-budget.command";
import { AddAllocationHandler } from "../../../application/commands/add-allocation.command";
import { UpdateAllocationHandler } from "../../../application/commands/update-allocation.command";
import { DeleteAllocationHandler } from "../../../application/commands/delete-allocation.command";
import { GetBudgetHandler } from "../../../application/queries/get-budget.query";
import { ListBudgetsHandler } from "../../../application/queries/list-budgets.query";
import { GetAllocationsHandler } from "../../../application/queries/get-allocations.query";
import { GetUnreadAlertsHandler } from "../../../application/queries/get-unread-alerts.query";
import { Budget } from "../../../domain/entities/budget.entity";
import { BudgetAllocation } from "../../../domain/entities/budget-allocation.entity";
import { BudgetPeriodType } from "../../../domain/enums/budget-period-type";
import { BudgetStatus } from "../../../domain/enums/budget-status";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

export class BudgetController {
  constructor(
    private readonly createBudgetHandler: CreateBudgetHandler,
    private readonly updateBudgetHandler: UpdateBudgetHandler,
    private readonly deleteBudgetHandler: DeleteBudgetHandler,
    private readonly activateBudgetHandler: ActivateBudgetHandler,
    private readonly archiveBudgetHandler: ArchiveBudgetHandler,
    private readonly addAllocationHandler: AddAllocationHandler,
    private readonly updateAllocationHandler: UpdateAllocationHandler,
    private readonly deleteAllocationHandler: DeleteAllocationHandler,
    private readonly getBudgetHandler: GetBudgetHandler,
    private readonly listBudgetsHandler: ListBudgetsHandler,
    private readonly getAllocationsHandler: GetAllocationsHandler,
    private readonly getUnreadAlertsHandler: GetUnreadAlertsHandler,
  ) {}

  async createBudget(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Body: {
        name: string;
        description?: string;
        totalAmount: number | string;
        currency: string;
        periodType: string;
        startDate: string;
        endDate?: string;
        isRecurring?: boolean;
        rolloverUnused?: boolean;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: "User not authenticated",
        });
      }

      const { workspaceId } = request.params;

      const budget = await this.createBudgetHandler.handle({
        workspaceId,
        name: request.body.name,
        description: request.body.description,
        totalAmount: request.body.totalAmount,
        currency: request.body.currency,
        periodType: request.body.periodType as BudgetPeriodType,
        startDate: new Date(request.body.startDate),
        endDate: request.body.endDate
          ? new Date(request.body.endDate)
          : undefined,
        createdBy: userId,
        isRecurring: request.body.isRecurring,
        rolloverUnused: request.body.rolloverUnused,
      });

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Budget created successfully",
        data: this.serializeBudget(budget),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateBudget(
    request: FastifyRequest<{
      Params: { workspaceId: string; budgetId: string };
      Body: {
        name?: string;
        description?: string | null;
        totalAmount?: number | string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: "User not authenticated",
        });
      }

      const { workspaceId, budgetId } = request.params;

      const budget = await this.updateBudgetHandler.handle({
        budgetId,
        workspaceId,
        userId,
        name: request.body.name,
        description: request.body.description,
        totalAmount: request.body.totalAmount,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Budget updated successfully",
        data: this.serializeBudget(budget),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateBudget(
    request: FastifyRequest<{
      Params: { workspaceId: string; budgetId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: "User not authenticated",
        });
      }

      const { workspaceId, budgetId } = request.params;

      const budget = await this.activateBudgetHandler.handle({
        budgetId,
        workspaceId,
        userId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Budget activated successfully",
        data: this.serializeBudget(budget),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async archiveBudget(
    request: FastifyRequest<{
      Params: { workspaceId: string; budgetId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: "User not authenticated",
        });
      }

      const { workspaceId, budgetId } = request.params;

      const budget = await this.archiveBudgetHandler.handle({
        budgetId,
        workspaceId,
        userId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Budget archived successfully",
        data: this.serializeBudget(budget),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteBudget(
    request: FastifyRequest<{
      Params: { workspaceId: string; budgetId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: "User not authenticated",
        });
      }

      const { workspaceId, budgetId } = request.params;

      await this.deleteBudgetHandler.handle({
        budgetId,
        workspaceId,
        userId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Budget deleted successfully",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getBudget(
    request: FastifyRequest<{
      Params: { workspaceId: string; budgetId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, budgetId } = request.params;

      const budget = await this.getBudgetHandler.handle({
        budgetId,
        workspaceId,
      });

      if (!budget) {
        return reply.status(404).send({
          success: false,
          statusCode: 404,
          message: "Budget not found",
        });
      }

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Budget retrieved successfully",
        data: this.serializeBudget(budget),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listBudgets(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Querystring: {
        status?: string;
        isActive?: string;
        createdBy?: string;
        currency?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { status, isActive, createdBy, currency } = request.query;

      const budgets = await this.listBudgetsHandler.handle({
        workspaceId,
        status: status as BudgetStatus | undefined,
        isActive:
          isActive === "true" ? true : isActive === "false" ? false : undefined,
        createdBy,
        currency,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Budgets retrieved successfully",
        data: budgets.map((budget) => this.serializeBudget(budget)),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async addAllocation(
    request: FastifyRequest<{
      Params: { workspaceId: string; budgetId: string };
      Body: {
        categoryId?: string;
        allocatedAmount: number | string;
        description?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: "User not authenticated",
        });
      }

      const { workspaceId, budgetId } = request.params;

      const allocation = await this.addAllocationHandler.handle({
        budgetId,
        workspaceId,
        userId,
        categoryId: request.body.categoryId,
        allocatedAmount: request.body.allocatedAmount,
        description: request.body.description,
      });

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Allocation added successfully",
        data: this.serializeAllocation(allocation),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateAllocation(
    request: FastifyRequest<{
      Params: { workspaceId: string; budgetId: string; allocationId: string };
      Body: {
        allocatedAmount?: number | string;
        description?: string | null;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: "User not authenticated",
        });
      }

      const { workspaceId, allocationId } = request.params;

      const allocation = await this.updateAllocationHandler.handle({
        allocationId,
        workspaceId,
        userId,
        allocatedAmount: request.body.allocatedAmount,
        description: request.body.description,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Allocation updated successfully",
        data: this.serializeAllocation(allocation),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteAllocation(
    request: FastifyRequest<{
      Params: { workspaceId: string; budgetId: string; allocationId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: "User not authenticated",
        });
      }

      const { workspaceId, allocationId } = request.params;

      await this.deleteAllocationHandler.handle({
        allocationId,
        workspaceId,
        userId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Allocation deleted successfully",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getAllocations(
    request: FastifyRequest<{
      Params: { workspaceId: string; budgetId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { budgetId } = request.params;

      const allocations = await this.getAllocationsHandler.handle({
        budgetId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Allocations retrieved successfully",
        data: allocations.map((allocation) =>
          this.serializeAllocation(allocation),
        ),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getUnreadAlerts(
    request: FastifyRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;

      const alerts = await this.getUnreadAlertsHandler.handle({
        workspaceId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Alerts retrieved successfully",
        data: alerts.map((alert) => ({
          alertId: alert.getId().getValue(),
          budgetId: alert.getBudgetId().getValue(),
          allocationId: alert.getAllocationId()?.getValue() || null,
          level: alert.getLevel(),
          threshold: alert.getThreshold().toString(),
          currentSpent: alert.getCurrentSpent().toString(),
          allocatedAmount: alert.getAllocatedAmount().toString(),
          message: alert.getMessage(),
          isRead: alert.isRead(),
          createdAt: alert.getCreatedAt().toISOString(),
        })),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  private serializeBudget(budget: Budget) {
    const period = budget.getPeriod();
    return {
      budgetId: budget.getId().getValue(),
      workspaceId: budget.getWorkspaceId(),
      name: budget.getName(),
      description: budget.getDescription(),
      totalAmount: budget.getTotalAmount().toString(),
      currency: budget.getCurrency(),
      periodType: period.getPeriodType(),
      startDate: period.getStartDate().toISOString(),
      endDate: period.getEndDate().toISOString(),
      status: budget.getStatus(),
      createdBy: budget.getCreatedBy(),
      isRecurring: budget.isRecurring(),
      rolloverUnused: budget.shouldRolloverUnused(),
      createdAt: budget.getCreatedAt().toISOString(),
      updatedAt: budget.getUpdatedAt().toISOString(),
    };
  }

  private serializeAllocation(allocation: BudgetAllocation) {
    return {
      allocationId: allocation.getId().getValue(),
      budgetId: allocation.getBudgetId().getValue(),
      categoryId: allocation.getCategoryId(),
      allocatedAmount: allocation.getAllocatedAmount().toString(),
      spentAmount: allocation.getSpentAmount().toString(),
      remainingAmount: allocation.getRemainingAmount().toString(),
      spentPercentage: allocation.getSpentPercentage(),
      description: allocation.getDescription(),
      createdAt: allocation.getCreatedAt().toISOString(),
      updatedAt: allocation.getUpdatedAt().toISOString(),
    };
  }
}
