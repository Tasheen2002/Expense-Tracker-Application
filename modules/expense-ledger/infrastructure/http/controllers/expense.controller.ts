import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateExpenseHandler } from '../../../application/commands/create-expense.command';
import { UpdateExpenseHandler } from '../../../application/commands/update-expense.command';
import { DeleteExpenseHandler } from '../../../application/commands/delete-expense.command';
import { SubmitExpenseHandler } from '../../../application/commands/submit-expense.command';
import { ApproveExpenseHandler } from '../../../application/commands/approve-expense.command';
import { RejectExpenseHandler } from '../../../application/commands/reject-expense.command';
import { ReimburseExpenseHandler } from '../../../application/commands/reimburse-expense.command';
import { GetExpenseHandler } from '../../../application/queries/get-expense.query';
import { FilterExpensesHandler } from '../../../application/queries/filter-expenses.query';
import { GetExpenseStatisticsHandler } from '../../../application/queries/get-expense-statistics.query';
import { Expense } from '../../../domain/entities/expense.entity';
import { PaymentMethod } from '../../../domain/enums/payment-method';
import { ExpenseStatus } from '../../../domain/enums/expense-status';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

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

  async createExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        title: string;
        description?: string;
        amount: number;
        currency: string;
        expenseDate: string;
        categoryId?: string;
        merchant?: string;
        paymentMethod: PaymentMethod;
        isReimbursable: boolean;
        tagIds?: string[];
      };
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
        description: body.description,
        amount: body.amount,
        currency: body.currency,
        expenseDate: body.expenseDate,
        categoryId: body.categoryId,
        merchant: body.merchant,
        paymentMethod: body.paymentMethod,
        isReimbursable: body.isReimbursable,
        tagIds: body.tagIds,
      });

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to create expense'
        );
      }
      if (!result.data) {
        return ResponseHelper.badRequest(reply, 'Failed to create expense');
      }

      const expense = result.data;

      return ResponseHelper.created(
        reply,
        'Expense created successfully',
        expense.toJSON()
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: {
        title?: string;
        description?: string;
        amount?: number;
        currency?: string;
        expenseDate?: string;
        categoryId?: string;
        merchant?: string;
        paymentMethod?: PaymentMethod;
        isReimbursable?: boolean;
      };
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
        title: body.title,
        description: body.description,
        amount: body.amount,
        currency: body.currency,
        expenseDate: body.expenseDate,
        categoryId: body.categoryId,
        merchant: body.merchant,
        paymentMethod: body.paymentMethod,
        isReimbursable: body.isReimbursable,
      });

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to update expense'
        );
      }
      if (!result.data) {
        return ResponseHelper.notFound(reply, 'Expense not found');
      }

      const expense = result.data;

      return ResponseHelper.ok(
        reply,
        'Expense updated successfully',
        expense.toJSON()
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

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to delete expense'
        );
      }

      return ResponseHelper.ok(reply, 'Expense deleted successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

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

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to get expense'
        );
      }
      if (!result.data) {
        return ResponseHelper.notFound(reply, 'Expense not found');
      }

      const expense = result.data;

      return ResponseHelper.ok(
        reply,
        'Expense retrieved successfully',
        expense.toJSON()
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listExpenses(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        userId?: string;
        limit?: string;
        offset?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { userId, limit, offset } = request.query;

      const result = await this.filterExpensesHandler.handle({
        workspaceId,
        userId: userId || request.user?.userId,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to retrieve expenses'
        );
      }
      if (!result.data) {
        return ResponseHelper.notFound(reply, 'No expenses found');
      }

      const data = result.data;

      return ResponseHelper.ok(reply, 'Expenses retrieved successfully', {
        items: data.items.map((expense: Expense) => expense.toJSON()),
        pagination: {
          total: data.total,
          limit: data.limit,
          offset: data.offset,
          hasMore: data.hasMore,
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async filterExpenses(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        userId?: string;
        categoryId?: string;
        status?: string;
        paymentMethod?: string;
        isReimbursable?: string;
        startDate?: string;
        endDate?: string;
        minAmount?: string;
        maxAmount?: string;
        currency?: string;
        searchText?: string;
        limit?: string;
        offset?: string;
      };
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
        status: query.status as ExpenseStatus | undefined,
        paymentMethod: query.paymentMethod as PaymentMethod | undefined,
        isReimbursable: query.isReimbursable === 'true',
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        minAmount: query.minAmount ? parseFloat(query.minAmount) : undefined,
        maxAmount: query.maxAmount ? parseFloat(query.maxAmount) : undefined,
        currency: query.currency,
        searchText: query.searchText,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to filter expenses'
        );
      }
      if (!result.data) {
        return ResponseHelper.notFound(reply, 'No expenses found');
      }

      const data = result.data;

      return ResponseHelper.ok(reply, 'Expenses filtered successfully', {
        items: data.items.map((expense: Expense) => expense.toJSON()),
        pagination: {
          total: data.total,
          limit: data.limit,
          offset: data.offset,
          hasMore: data.hasMore,
        },
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

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to get expense statistics'
        );
      }
      if (!result.data) {
        return ResponseHelper.notFound(reply, 'Expense statistics not found');
      }

      return ResponseHelper.ok(
        reply,
        'Expense statistics retrieved successfully',
        result.data
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

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to submit expense'
        );
      }
      if (!result.data) {
        return ResponseHelper.notFound(reply, 'Expense not found');
      }

      const expense = result.data;

      return ResponseHelper.ok(reply, 'Expense submitted successfully', {
        expenseId: expense.id.getValue(),
        status: expense.status,
        updatedAt: expense.updatedAt.toISOString(),
      });
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

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to approve expense'
        );
      }
      if (!result.data) {
        return ResponseHelper.notFound(reply, 'Expense not found');
      }

      const expense = result.data;

      return ResponseHelper.ok(reply, 'Expense approved successfully', {
        expenseId: expense.id.getValue(),
        status: expense.status,
        updatedAt: expense.updatedAt.toISOString(),
      });
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

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to reject expense'
        );
      }
      if (!result.data) {
        return ResponseHelper.notFound(reply, 'Expense not found');
      }

      const expense = result.data;

      return ResponseHelper.ok(reply, 'Expense rejected successfully', {
        expenseId: expense.id.getValue(),
        status: expense.status,
        updatedAt: expense.updatedAt.toISOString(),
      });
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

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to reimburse expense'
        );
      }
      if (!result.data) {
        return ResponseHelper.notFound(reply, 'Expense not found');
      }

      const expense = result.data;

      return ResponseHelper.ok(
        reply,
        'Expense marked as reimbursed successfully',
        {
          expenseId: expense.id.getValue(),
          status: expense.status,
          updatedAt: expense.updatedAt.toISOString(),
        }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
