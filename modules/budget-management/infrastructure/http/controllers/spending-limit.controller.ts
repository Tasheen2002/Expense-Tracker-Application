import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateSpendingLimitHandler } from '../../../application/commands/create-spending-limit.command';
import { UpdateSpendingLimitHandler } from '../../../application/commands/update-spending-limit.command';
import { DeleteSpendingLimitHandler } from '../../../application/commands/delete-spending-limit.command';
import { ListSpendingLimitsHandler } from '../../../application/queries/list-spending-limits.query';
import { SpendingLimit } from '../../../domain/entities/spending-limit.entity';
import { BudgetPeriodType } from '../../../domain/enums/budget-period-type';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

export class SpendingLimitController {
  constructor(
    private readonly createLimitHandler: CreateSpendingLimitHandler,
    private readonly updateLimitHandler: UpdateSpendingLimitHandler,
    private readonly deleteLimitHandler: DeleteSpendingLimitHandler,
    private readonly listLimitsHandler: ListSpendingLimitsHandler
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
      Params: { workspaceId: string; limitId: string };
      Body: {
        limitAmount?: number | string;
      };
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
      Params: { workspaceId: string; limitId: string };
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
        'Spending limit deleted successfully'
      );
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
        limit?: string;
        offset?: string;
      };
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
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Spending limits retrieved successfully',
        {
          items: result.data?.items.map((limit) => limit.toJSON()) || [],
          pagination: {
            total: result.data?.total || 0,
            limit: result.data?.limit || 0,
            offset: result.data?.offset || 0,
            hasMore: result.data?.hasMore || false,
          },
        }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
