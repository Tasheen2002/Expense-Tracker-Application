import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateSplitHandler } from '../../../application/commands/create-split.command';
import { DeleteSplitHandler } from '../../../application/commands/delete-split.command';
import { RecordPaymentHandler } from '../../../application/commands/record-payment.command';
import { GetSplitHandler } from '../../../application/queries/get-split.query';
import { ListUserSplitsHandler } from '../../../application/queries/list-user-splits.query';
import { ListUserSettlementsHandler } from '../../../application/queries/list-user-settlements.query';
import { ExpenseSplitService } from '../../../application/services/expense-split.service';
import { SplitType } from '../../../domain/enums/split-type';
import { SettlementStatus } from '../../../domain/enums/settlement-status';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

export class ExpenseSplitController {
  constructor(
    private readonly createSplitHandler: CreateSplitHandler,
    private readonly deleteSplitHandler: DeleteSplitHandler,
    private readonly recordPaymentHandler: RecordPaymentHandler,
    private readonly getSplitHandler: GetSplitHandler,
    private readonly listUserSplitsHandler: ListUserSplitsHandler,
    private readonly listUserSettlementsHandler: ListUserSettlementsHandler,
    private readonly splitService: ExpenseSplitService
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

      if (!result.success || !result.data) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to create split'
        );
      }

      const split = result.data;

      return ResponseHelper.created(
        reply,
        'Split created successfully',
        split.toJSON()
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

      if (!result.success || !result.data) {
        return ResponseHelper.notFound(
          reply,
          result.error ?? 'Split not found'
        );
      }

      const split = result.data;

      return ResponseHelper.ok(
        reply,
        'Split retrieved successfully',
        split.toJSON()
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
      const split = await this.splitService.getSplitByExpenseId(
        expenseId,
        workspaceId,
        userId
      );

      if (!split) {
        return ResponseHelper.notFound(reply, 'Split not found');
      }

      return ResponseHelper.ok(
        reply,
        'Split retrieved successfully',
        split.toJSON()
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

      if (!result.success || !result.data) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to retrieve splits'
        );
      }

      return ResponseHelper.ok(reply, 'Splits retrieved successfully', {
        items: result.data.items.map((split) => split.toJSON()),
        pagination: {
          total: result.data.total,
          limit: result.data.limit,
          offset: result.data.offset,
          hasMore: result.data.hasMore,
        },
      });
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

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to delete split'
        );
      }

      return ResponseHelper.ok(reply, 'Split deleted successfully');
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

      if (!result.success || !result.data) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to record payment'
        );
      }

      const settlement = result.data;

      return ResponseHelper.ok(
        reply,
        'Payment recorded successfully',
        settlement.toJSON()
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

      if (!result.success || !result.data) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to retrieve settlements'
        );
      }

      return ResponseHelper.ok(reply, 'Settlements retrieved successfully', {
        items: result.data.items.map((s) => s.toJSON()),
        pagination: {
          total: result.data.total,
          limit: result.data.limit,
          offset: result.data.offset,
          hasMore: result.data.hasMore,
        },
      });
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
      const settlements = await this.splitService.getSplitSettlements(
        splitId,
        workspaceId,
        userId
      );

      return ResponseHelper.ok(
        reply,
        'Split settlements retrieved successfully',
        {
          items: settlements.items.map((s) => s.toJSON()),
        }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
