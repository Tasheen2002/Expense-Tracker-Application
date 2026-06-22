import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  CreateSplitHandler,
  DeleteSplitHandler,
  RecordPaymentHandler,
  GetSplitHandler,
  GetSplitByExpenseHandler,
  ListUserSplitsHandler,
  ListUserSettlementsHandler,
  GetSplitSettlementsHandler,
} from '../../../application';
import { ResponseHelper } from '@shared/response.helper';
import {
  CreateSplitInput,
  RecordSettlementPaymentInput,
  ListSettlementsQuery,
} from '../validation/expense-split.schema';
import { paginationQuerySchema } from '../validation/common.schema';
import { z } from 'zod';

type PaginationQuery = z.infer<typeof paginationQuerySchema>;

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

      return ResponseHelper.ok(reply, 'Split retrieved successfully', result);
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

      return ResponseHelper.ok(reply, 'Split retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listUserSplits(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: PaginationQuery;
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
        limit,
        offset,
      });

      return ResponseHelper.ok(reply, 'Splits retrieved successfully', {
        items: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listUserSettlements(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: ListSettlementsQuery;
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
        limit,
        offset,
      });

      return ResponseHelper.ok(reply, 'Settlements retrieved successfully', {
        items: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
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
      const result = await this.getSplitSettlementsHandler.handle({
        splitId,
        workspaceId,
        userId,
      });

      return ResponseHelper.ok(reply, 'Split settlements retrieved successfully', {
        items: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async createSplit(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: CreateSplitInput;
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
        participants: participants.map((p) => ({
          userId: p.userId,
          shareAmount: p.shareAmount,
          sharePercentage: p.sharePercentage,
        })),
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
        'Split deleted successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async recordPayment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; settlementId: string };
      Body: RecordSettlementPaymentInput;
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
        'Payment recorded successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
