import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { CreateSpendingLimitHandler } from "../../../application/commands/create-spending-limit.command";
import { UpdateSpendingLimitHandler } from "../../../application/commands/update-spending-limit.command";
import { DeleteSpendingLimitHandler } from "../../../application/commands/delete-spending-limit.command";
import { ListSpendingLimitsHandler } from "../../../application/queries/list-spending-limits.query";
import { SpendingLimit } from "../../../domain/entities/spending-limit.entity";
import { BudgetPeriodType } from "../../../domain/enums/budget-period-type";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

export class SpendingLimitController {
  constructor(
    private readonly createLimitHandler: CreateSpendingLimitHandler,
    private readonly updateLimitHandler: UpdateSpendingLimitHandler,
    private readonly deleteLimitHandler: DeleteSpendingLimitHandler,
    private readonly listLimitsHandler: ListSpendingLimitsHandler,
  ) {}

  async createLimit(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        userId?: string;
        categoryId?: string;
        limitAmount: number | string;
        currency: string;
        periodType: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;

      const limit = await this.createLimitHandler.handle({
        workspaceId,
        userId: request.body.userId,
        categoryId: request.body.categoryId,
        limitAmount: request.body.limitAmount,
        currency: request.body.currency,
        periodType: request.body.periodType as BudgetPeriodType,
      });

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Spending limit created successfully",
        data: this.serializeLimit(limit),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateLimit(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; limitId: string };
      Body: {
        limitAmount?: number | string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, limitId } = request.params;

      const limit = await this.updateLimitHandler.handle({
        limitId,
        workspaceId,
        limitAmount: request.body.limitAmount,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Spending limit updated successfully",
        data: this.serializeLimit(limit),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteLimit(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; limitId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, limitId } = request.params;

      await this.deleteLimitHandler.handle({
        limitId,
        workspaceId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Spending limit deleted successfully",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listLimits(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        userId?: string;
        categoryId?: string;
        isActive?: string;
        periodType?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { userId, categoryId, isActive, periodType } = request.query;

      const limits = await this.listLimitsHandler.handle({
        workspaceId,
        userId,
        categoryId,
        isActive:
          isActive === "true" ? true : isActive === "false" ? false : undefined,
        periodType: periodType as BudgetPeriodType | undefined,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Spending limits retrieved successfully",
        data: limits.map((limit) => this.serializeLimit(limit)),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  private serializeLimit(limit: SpendingLimit) {
    return {
      limitId: limit.getId().getValue(),
      workspaceId: limit.getWorkspaceId(),
      userId: limit.getUserId(),
      categoryId: limit.getCategoryId(),
      limitAmount: limit.getLimitAmount().toString(),
      currency: limit.getCurrency(),
      periodType: limit.getPeriodType(),
      isActive: limit.isActive(),
      scope: limit.isWorkspaceWide()
        ? "workspace"
        : limit.isUserSpecific()
          ? "user"
          : "category",
      createdAt: limit.getCreatedAt().toISOString(),
      updatedAt: limit.getUpdatedAt().toISOString(),
    };
  }
}
