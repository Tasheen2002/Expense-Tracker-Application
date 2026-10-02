import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import {
  CreateExpenseHandler,
  UpdateExpenseHandler,
  DeleteExpenseHandler,
  SubmitExpenseHandler,
  ApproveExpenseHandler,
  RejectExpenseHandler,
  ReimburseExpenseHandler,
  GetExpenseHandler,
  FilterExpensesHandler,
  GetExpenseStatisticsHandler,
} from '../../../application';
import { ResponseHelper } from '@shared/response.helper';
import {
  CreateExpenseInput,
  UpdateExpenseInput,
  FilterExpensesQuery,
  ExpenseStatisticsQuery,
} from '../validation/expense.schema';
import { paginationQuerySchema } from '../validation/common.schema';
import { z } from 'zod';

import { WorkspaceMembershipContext, WorkspaceRole } from '../../../application/ports/workspace-authorization.port';

type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export class ExpenseController {
  constructor(
    private readonly createExpenseHandler: CreateExpenseHandler,
    private readonly updateExpenseHandler: UpdateExpenseHandler,
    private readonly deleteExpenseHandler: DeleteExpenseHandler,
    private readonly submitExpenseHandler: SubmitExpenseHandler,
    private readonly approveExpenseHandler: ApproveExpenseHandler,
    private readonly rejectExpenseHandler: RejectExpenseHandler,
    private readonly reimburseExpenseHandler: ReimburseExpenseHandler,
    private readonly getExpenseHandler: GetExpenseHandler,
    private readonly filterExpensesHandler: FilterExpensesHandler,
    private readonly getExpenseStatisticsHandler: GetExpenseStatisticsHandler
  ) {}

  private getVerifiedMembership(
    request: AuthenticatedRequest,
    userId?: string,
    workspaceId?: string
  ): WorkspaceMembershipContext | undefined {
    const uid = userId || request.user?.userId || request.user?.id;
    const wid = workspaceId || (request.params as { workspaceId?: string })?.workspaceId;
    if (request.workspaceMembership && uid && wid) {
      return {
        userId: uid,
        workspaceId: wid,
        role: request.workspaceMembership.role as WorkspaceRole,
      };
    }
    return undefined;
  }

  async getExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params;
      const userId = request.user?.userId || request.user?.id;
      const role = request.workspaceMembership?.role;

      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const result = await this.getExpenseHandler.handle({
        expenseId,
        workspaceId,
        userId,
        role,
        authToken: request.headers.authorization,
        verifiedMembership: this.getVerifiedMembership(request, userId, workspaceId),
      });

      return ResponseHelper.ok(reply, 'Expense retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listExpenses(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: PaginationQuery & { userId?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { userId, limit, offset } = request.query;
      const actorId = request.user?.userId || request.user?.id;
      const role = request.workspaceMembership?.role;

      if (!actorId) {
        return ResponseHelper.unauthorized(reply);
      }

      const result = await this.filterExpensesHandler.handle({
        workspaceId,
        actorId,
        userId,
        role,
        limit,
        offset,
        authToken: request.headers.authorization,
        verifiedMembership: this.getVerifiedMembership(request, actorId, workspaceId),
      });

      return ResponseHelper.ok(reply, 'Expenses retrieved successfully', {
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

  async filterExpenses(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: FilterExpensesQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const query = request.query;
      const actorId = request.user?.userId || request.user?.id;
      const role = request.workspaceMembership?.role;

      if (!actorId) {
        return ResponseHelper.unauthorized(reply);
      }

      const result = await this.filterExpensesHandler.handle({
        workspaceId,
        actorId,
        role,
        userId: query.userId,
        categoryId: query.categoryId,
        status: query.status,
        paymentMethod: query.paymentMethod,
        isReimbursable: query.isReimbursable,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        minAmount: query.minAmount,
        maxAmount: query.maxAmount,
        currency: query.currency,
        searchText: query.searchText,
        limit: query.page && query.pageSize ? query.pageSize : undefined,
        offset: query.page && query.pageSize ? (query.page - 1) * query.pageSize : undefined,
        authToken: request.headers.authorization,
        verifiedMembership: this.getVerifiedMembership(request, actorId, workspaceId),
      });

      return ResponseHelper.ok(reply, 'Expenses filtered successfully', {
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

  async getExpenseStatistics(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: ExpenseStatisticsQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { userId, currency } = request.query;
      const actorId = request.user?.userId || request.user?.id;
      const role = request.workspaceMembership?.role;

      if (!actorId) {
        return ResponseHelper.unauthorized(reply);
      }

      const result = await this.getExpenseStatisticsHandler.handle({
        workspaceId,
        actorId,
        userId,
        role,
        currency,
        authToken: request.headers.authorization,
        verifiedMembership: this.getVerifiedMembership(request, actorId, workspaceId),
      });

      return ResponseHelper.ok(reply, 'Expense statistics retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async createExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: CreateExpenseInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const { workspaceId } = request.params;
      const body = request.body;

      const result = await this.createExpenseHandler.handle({
        workspaceId,
        userId,
        title: body.title,
        description: body.description ?? undefined,
        amount: body.amount,
        currency: body.currency,
        expenseDate: new Date(body.expenseDate),
        categoryId: body.categoryId ?? undefined,
        merchant: body.merchant ?? undefined,
        paymentMethod: body.paymentMethod,
        isReimbursable: body.isReimbursable,
        tagIds: body.tagIds ?? undefined,
        authToken: request.headers.authorization,
        verifiedMembership: this.getVerifiedMembership(request, userId, workspaceId),
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Expense created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: UpdateExpenseInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const { workspaceId, expenseId } = request.params;
      const body = request.body;

      const result = await this.updateExpenseHandler.handle({
        expenseId,
        workspaceId,
        userId,
        title: body.title !== undefined ? body.title : undefined,
        description: body.description !== undefined ? body.description : undefined,
        amount: body.amount !== undefined ? body.amount : undefined,
        currency: body.currency !== undefined ? body.currency : undefined,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : undefined,
        categoryId: body.categoryId !== undefined ? body.categoryId : undefined,
        merchant: body.merchant !== undefined ? body.merchant : undefined,
        paymentMethod: body.paymentMethod !== undefined ? body.paymentMethod : undefined,
        isReimbursable: body.isReimbursable !== undefined ? body.isReimbursable : undefined,
        authToken: request.headers.authorization,
        verifiedMembership: this.getVerifiedMembership(request, userId, workspaceId),
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Expense updated successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const { workspaceId, expenseId } = request.params;

      const result = await this.deleteExpenseHandler.handle({
        expenseId,
        workspaceId,
        userId,
        authToken: request.headers.authorization,
        verifiedMembership: this.getVerifiedMembership(request, userId, workspaceId),
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Expense deleted successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async submitExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const { workspaceId, expenseId } = request.params;

      const result = await this.submitExpenseHandler.handle({
        expenseId,
        workspaceId,
        userId,
        authToken: request.headers.authorization,
        verifiedMembership: this.getVerifiedMembership(request, userId, workspaceId),
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Expense submitted successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async approveExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const { workspaceId, expenseId } = request.params;

      const result = await this.approveExpenseHandler.handle({
        expenseId,
        workspaceId,
        approverId: userId,
        authToken: request.headers.authorization,
        verifiedMembership: this.getVerifiedMembership(request, userId, workspaceId),
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Expense approved successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async rejectExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: { reason?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const { workspaceId, expenseId } = request.params;
      const reason = request.body?.reason;

      const result = await this.rejectExpenseHandler.handle({
        expenseId,
        workspaceId,
        rejecterId: userId,
        reason,
        authToken: request.headers.authorization,
        verifiedMembership: this.getVerifiedMembership(request, userId, workspaceId),
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Expense rejected successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async reimburseExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const { workspaceId, expenseId } = request.params;

      const result = await this.reimburseExpenseHandler.handle({
        expenseId,
        workspaceId,
        processedBy: userId,
        authToken: request.headers.authorization,
        verifiedMembership: this.getVerifiedMembership(request, userId, workspaceId),
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Expense marked as reimbursed successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
