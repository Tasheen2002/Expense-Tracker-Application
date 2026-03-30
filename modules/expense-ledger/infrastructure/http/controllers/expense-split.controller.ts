import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateSplitHandler } from '../../../application/commands/create-split.command';
import { DeleteSplitHandler } from '../../../application/commands/delete-split.command';
import { RecordPaymentHandler } from '../../../application/commands/record-payment.command';
import { GetSplitHandler } from '../../../application/queries/get-split.query';
import { GetSplitByExpenseHandler } from '../../../application/queries/get-split-by-expense.query';
import { ListUserSplitsHandler } from '../../../application/queries/list-user-splits.query';
import { ListUserSettlementsHandler } from '../../../application/queries/list-user-settlements.query';
import { GetSplitSettlementsHandler } from '../../../application/queries/get-split-settlements.query';
import { SplitType } from '../../../domain/enums/split-type';
import { SettlementStatus } from '../../../domain/enums/settlement-status';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

export class ExpenseSplitController {
  constructor(
    private readonly createSplitHandler: CreateSplitHandler,
    private readonly deleteSplitHandler: DeleteSplitHandler,
    private readonly recordPaymentHandler: RecordPaymentHandler,
    private readonly getSplitHandler: GetSplitHandler,
    private readonly getSplitByExpenseHandler: GetSplitByExpenseHandler,
    private readonly listUserSplitsHandler: ListUserSplitsHandler,
    private readonly listUserSettlementsHandler: ListUserSettlementsHandler,
    private readonly getSplitSettlementsHandler: GetSplitSettlementsHandler
  ) {}

  async createSplit(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: {
        splitType: SplitType;
        participants: Array<{
          userId: string;
          shareAmount?: number;
          sharePercentage?: number;
        }>;
      };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId, expenseId } = request.params;
    const { splitType, participants } = request.body;
    const userId = request.user.userId;

    try {
      const result = await this.createSplitHandler.handle({
        expenseId,
        workspaceId,
        userId,
        splitType,
        participants,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Split created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getSplit(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; splitId: string };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId, splitId } = request.params;
    const userId = request.user.userId;

    try {
      const result = await this.getSplitHandler.handle({
        splitId,
        workspaceId,
        userId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Split retrieved successfully',
        result.data?.toJSON()
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getSplitByExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId, expenseId } = request.params;
    const userId = request.user.userId;

    try {
      const result = await this.getSplitByExpenseHandler.handle({
        expenseId,
        workspaceId,
        userId,
      });

      return ResponseHelper.fromQuery(
        reply,
        'Split retrieved successfully',
        result,
        result.data?.toJSON()
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listUserSplits(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;
    const { limit, offset } = request.query;
    const userId = request.user.userId;

    try {
      const result = await this.listUserSplitsHandler.handle({
        userId,
        workspaceId,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Splits retrieved successfully',
        result.data
          ? {
              items: result.data.items.map((split) => split.toJSON()),
              pagination: {
                total: result.data.total,
                limit: result.data.limit,
                offset: result.data.offset,
                hasMore: result.data.hasMore,
              },
            }
          : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteSplit(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; splitId: string };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId, splitId } = request.params;
    const userId = request.user.userId;

    try {
      const result = await this.deleteSplitHandler.handle({
        splitId,
        workspaceId,
        userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Split deleted successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async recordPayment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; settlementId: string };
      Body: { amount: number };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId, settlementId } = request.params;
    const { amount } = request.body;
    const userId = request.user.userId;

    try {
      const result = await this.recordPaymentHandler.handle({
        settlementId,
        workspaceId,
        userId,
        amount,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Payment recorded successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listUserSettlements(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        status?: SettlementStatus;
        limit?: string;
        offset?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;
    const { status, limit, offset } = request.query;
    const userId = request.user.userId;

    try {
      const result = await this.listUserSettlementsHandler.handle({
        userId,
        workspaceId,
        status,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Settlements retrieved successfully',
        result.data
          ? {
              items: result.data.items.map((s) => s.toJSON()),
              pagination: {
                total: result.data.total,
                limit: result.data.limit,
                offset: result.data.offset,
                hasMore: result.data.hasMore,
              },
            }
          : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getSplitSettlements(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; splitId: string };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId, splitId } = request.params;
    const userId = request.user.userId;

    try {
      const result = await this.getSplitSettlementsHandler.handle({
        splitId,
        workspaceId,
        userId,
      });

      return ResponseHelper.fromQuery(
        reply,
        'Split settlements retrieved successfully',
        result,
        result.data
          ? {
              items: result.data.items.map((s) => s.toJSON()),
            }
          : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
