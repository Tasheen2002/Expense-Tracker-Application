import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  CreateSpendingLimitHandler,
  UpdateSpendingLimitHandler,
  DeleteSpendingLimitHandler,
  GetSpendingLimitHandler,
  ListSpendingLimitsHandler,
} from '../../../application';
import { BudgetPeriodType } from '../../../domain/enums/budget-period-type';
import { ResponseHelper } from '@shared/response.helper';
import {
  SpendingLimitWorkspaceParams,
  SpendingLimitParams,
  CreateSpendingLimitBody,
  UpdateSpendingLimitBody,
  ListSpendingLimitsQuery,
} from '../validation/spending-limit.schema';

export class SpendingLimitController {
  constructor(
    private readonly createLimitHandler: CreateSpendingLimitHandler,
    private readonly updateLimitHandler: UpdateSpendingLimitHandler,
    private readonly deleteLimitHandler: DeleteSpendingLimitHandler,
    private readonly getLimitHandler: GetSpendingLimitHandler,
    private readonly listLimitsHandler: ListSpendingLimitsHandler
  ) {}

  async getLimit(
    request: AuthenticatedRequest<{
      Params: SpendingLimitParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, limitId } = request.params;

      const limit = await this.getLimitHandler.handle({
        limitId,
        workspaceId,
      });

      return ResponseHelper.ok(reply, 'Spending limit retrieved successfully', limit);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listLimits(
    request: AuthenticatedRequest<{
      Params: SpendingLimitWorkspaceParams;
      Querystring: ListSpendingLimitsQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { userId, categoryId, isActive, periodType, limit, offset } =
        request.query;

      const result = await this.listLimitsHandler.handle({
        workspaceId,
        userId,
        categoryId,
        isActive:
          isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        periodType: periodType as BudgetPeriodType | undefined,
        limit,
        offset,
      });

      return ResponseHelper.ok(reply, 'Spending limits retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async createLimit(
    request: AuthenticatedRequest<{
      Params: SpendingLimitWorkspaceParams;
      Body: CreateSpendingLimitBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;

      const result = await this.createLimitHandler.handle({
        workspaceId,
        userId: request.body.userId,
        categoryId: request.body.categoryId,
        limitAmount: request.body.limitAmount,
        currency: request.body.currency,
        periodType: request.body.periodType as BudgetPeriodType,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Spending limit created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateLimit(
    request: AuthenticatedRequest<{
      Params: SpendingLimitParams;
      Body: UpdateSpendingLimitBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, limitId } = request.params;

      const result = await this.updateLimitHandler.handle({
        limitId,
        workspaceId,
        limitAmount: request.body.limitAmount,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Spending limit updated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteSpendingLimit(
    request: AuthenticatedRequest<{
      Params: SpendingLimitParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, limitId } = request.params;
      const userId = request.user.userId;

      const result = await this.deleteLimitHandler.handle({
        limitId,
        workspaceId,
        userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Spending limit deleted successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
