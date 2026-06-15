import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
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
import { PaymentMethod } from '../../../domain/enums/payment-method';
import { ExpenseStatus } from '../../../domain/enums/expense-status';
import { ResponseHelper } from '@shared/response.helper';
import {
  CreateExpenseInput,
  UpdateExpenseInput,
  FilterExpensesQuery,
} from '../validation/expense.schema';
import { paginationQuerySchema } from '../validation/common.schema';
import { z } from 'zod';

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

  async getExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params;

      const result = await this.getExpenseHandler.handle({
        expenseId,
        workspaceId,
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

      const result = await this.filterExpensesHandler.handle({
        workspaceId,
        userId: userId || request.user?.userId,
        limit,
        offset,
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

      const result = await this.filterExpensesHandler.handle({
        workspaceId,
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
      Querystring: { userId?: string; currency?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { userId, currency } = request.query;

      const result = await this.getExpenseStatisticsHandler.handle({
        workspaceId,
        userId,
        currency,
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
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        amount: body.amount ?? undefined,
        currency: body.currency ?? undefined,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : undefined,
        categoryId: body.categoryId ?? undefined,
        merchant: body.merchant ?? undefined,
        paymentMethod: body.paymentMethod ?? undefined,
        isReimbursable: body.isReimbursable ?? undefined,
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
