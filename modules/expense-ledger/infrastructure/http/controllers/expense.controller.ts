import { FastifyRequest, FastifyReply } from "fastify";
import { CreateExpenseHandler } from "../../../application/commands/create-expense.command";
import { UpdateExpenseHandler } from "../../../application/commands/update-expense.command";
import { DeleteExpenseHandler } from "../../../application/commands/delete-expense.command";
import { SubmitExpenseHandler } from "../../../application/commands/submit-expense.command";
import { ApproveExpenseHandler } from "../../../application/commands/approve-expense.command";
import { RejectExpenseHandler } from "../../../application/commands/reject-expense.command";
import { ReimburseExpenseHandler } from "../../../application/commands/reimburse-expense.command";
import { GetExpenseHandler } from "../../../application/queries/get-expense.query";
import { ListExpensesHandler } from "../../../application/queries/list-expenses.query";
import { FilterExpensesHandler } from "../../../application/queries/filter-expenses.query";
import { GetExpenseStatisticsHandler } from "../../../application/queries/get-expense-statistics.query";
import { Expense } from "../../../domain/entities/expense.entity";
import { TagId } from "../../../domain/value-objects/tag-id";
import { AttachmentId } from "../../../domain/value-objects/attachment-id";

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
    private readonly listExpensesHandler: ListExpensesHandler,
    private readonly filterExpensesHandler: FilterExpensesHandler,
    private readonly getExpenseStatisticsHandler: GetExpenseStatisticsHandler,
  ) {}

  async createExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Body: {
        title: string;
        description?: string;
        amount: number;
        currency: string;
        expenseDate: string;
        categoryId?: string;
        merchant?: string;
        paymentMethod: string;
        isReimbursable: boolean;
        tagIds?: string[];
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

      const expense = await this.createExpenseHandler.handle({
        workspaceId,
        userId,
        title: request.body.title,
        description: request.body.description,
        amount: request.body.amount,
        currency: request.body.currency,
        expenseDate: request.body.expenseDate,
        categoryId: request.body.categoryId,
        merchant: request.body.merchant,
        paymentMethod: request.body.paymentMethod as any,
        isReimbursable: request.body.isReimbursable,
        tagIds: request.body.tagIds,
      });

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Expense created successfully",
        data: {
          expenseId: expense.id.getValue(),
          workspaceId: expense.workspaceId,
          userId: expense.userId,
          title: expense.title,
          description: expense.description,
          amount: expense.amount.getAmount().toString(),
          currency: expense.amount.getCurrency(),
          expenseDate: expense.expenseDate.toDateString(),
          categoryId: expense.categoryId?.getValue(),
          merchant: expense.merchant,
          paymentMethod: expense.paymentMethod,
          isReimbursable: expense.isReimbursable,
          status: expense.status,
          createdAt: expense.createdAt.toISOString(),
          updatedAt: expense.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      });
    }
  }

  async updateExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: {
        title?: string;
        description?: string;
        amount?: number;
        currency?: string;
        expenseDate?: string;
        categoryId?: string;
        merchant?: string;
        paymentMethod?: string;
        isReimbursable?: boolean;
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
      const { workspaceId, expenseId } = request.params;

      const expense = await this.updateExpenseHandler.handle({
        expenseId,
        workspaceId,
        userId,
        title: request.body.title,
        description: request.body.description,
        amount: request.body.amount,
        currency: request.body.currency,
        expenseDate: request.body.expenseDate,
        categoryId: request.body.categoryId,
        merchant: request.body.merchant,
        paymentMethod: request.body.paymentMethod as any,
        isReimbursable: request.body.isReimbursable,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Expense updated successfully",
        data: {
          expenseId: expense.id.getValue(),
          workspaceId: expense.workspaceId,
          userId: expense.userId,
          title: expense.title,
          description: expense.description,
          amount: expense.amount.getAmount().toString(),
          currency: expense.amount.getCurrency(),
          expenseDate: expense.expenseDate.toDateString(),
          categoryId: expense.categoryId?.getValue(),
          merchant: expense.merchant,
          paymentMethod: expense.paymentMethod,
          isReimbursable: expense.isReimbursable,
          status: expense.status,
          updatedAt: expense.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      });
    }
  }

  async deleteExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string };
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
      const { workspaceId, expenseId } = request.params;

      await this.deleteExpenseHandler.handle({
        expenseId,
        workspaceId,
        userId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Expense deleted successfully",
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      });
    }
  }

  async getExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, expenseId } = request.params;

      const expense = await this.getExpenseHandler.handle({
        expenseId,
        workspaceId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Expense retrieved successfully",
        data: {
          expenseId: expense.id.getValue(),
          workspaceId: expense.workspaceId,
          userId: expense.userId,
          title: expense.title,
          description: expense.description,
          amount: expense.amount.getAmount().toString(),
          currency: expense.amount.getCurrency(),
          expenseDate: expense.expenseDate.toDateString(),
          categoryId: expense.categoryId?.getValue(),
          merchant: expense.merchant,
          paymentMethod: expense.paymentMethod,
          isReimbursable: expense.isReimbursable,
          status: expense.status,
          tagIds: expense.tagIds.map((id: TagId) => id.getValue()),
          attachmentIds: expense.attachmentIds.map((id: AttachmentId) =>
            id.getValue(),
          ),
          createdAt: expense.createdAt.toISOString(),
          updatedAt: expense.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        statusCode: 404,
        message: error.message,
      });
    }
  }

  async listExpenses(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Querystring: { userId?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { userId } = request.query;

      const expenses = await this.listExpensesHandler.handle({
        workspaceId,
        userId: userId || request.user?.userId, // Default to own expenses if no specific user requested (Privacy Fix)
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Expenses retrieved successfully",
        data: expenses.map((expense: Expense) => ({
          expenseId: expense.id.getValue(),
          workspaceId: expense.workspaceId,
          userId: expense.userId,
          title: expense.title,
          description: expense.description,
          amount: expense.amount.getAmount().toString(),
          currency: expense.amount.getCurrency(),
          expenseDate: expense.expenseDate.toDateString(),
          categoryId: expense.categoryId?.getValue(),
          merchant: expense.merchant,
          paymentMethod: expense.paymentMethod,
          isReimbursable: expense.isReimbursable,
          status: expense.status,
          createdAt: expense.createdAt.toISOString(),
          updatedAt: expense.updatedAt.toISOString(),
        })),
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      });
    }
  }

  async filterExpenses(
    request: FastifyRequest<{
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
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const query = request.query;

      const expenses = await this.filterExpensesHandler.handle({
        workspaceId,
        userId: query.userId,
        categoryId: query.categoryId,
        status: query.status as any,
        paymentMethod: query.paymentMethod as any,
        isReimbursable: query.isReimbursable === "true",
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        minAmount: query.minAmount ? parseFloat(query.minAmount) : undefined,
        maxAmount: query.maxAmount ? parseFloat(query.maxAmount) : undefined,
        currency: query.currency,
        searchText: query.searchText,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Expenses filtered successfully",
        data: expenses.map((expense: Expense) => ({
          expenseId: expense.id.getValue(),
          workspaceId: expense.workspaceId,
          userId: expense.userId,
          title: expense.title,
          description: expense.description,
          amount: expense.amount.getAmount().toString(),
          currency: expense.amount.getCurrency(),
          expenseDate: expense.expenseDate.toDateString(),
          categoryId: expense.categoryId?.getValue(),
          merchant: expense.merchant,
          paymentMethod: expense.paymentMethod,
          isReimbursable: expense.isReimbursable,
          status: expense.status,
          createdAt: expense.createdAt.toISOString(),
          updatedAt: expense.updatedAt.toISOString(),
        })),
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      });
    }
  }

  async getExpenseStatistics(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Querystring: { userId?: string; currency?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { userId, currency } = request.query;

      const statistics = await this.getExpenseStatisticsHandler.handle({
        workspaceId,
        userId,
        currency,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Expense statistics retrieved successfully",
        data: statistics,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      });
    }
  }

  async submitExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string };
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
      const { workspaceId, expenseId } = request.params;

      const expense = await this.submitExpenseHandler.handle({
        expenseId,
        workspaceId,
        userId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Expense submitted successfully",
        data: {
          expenseId: expense.id.getValue(),
          status: expense.status,
          updatedAt: expense.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      });
    }
  }

  async approveExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, expenseId } = request.params;

      const expense = await this.approveExpenseHandler.handle({
        expenseId,
        workspaceId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Expense approved successfully",
        data: {
          expenseId: expense.id.getValue(),
          status: expense.status,
          updatedAt: expense.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      });
    }
  }

  async rejectExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, expenseId } = request.params;

      const expense = await this.rejectExpenseHandler.handle({
        expenseId,
        workspaceId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Expense rejected successfully",
        data: {
          expenseId: expense.id.getValue(),
          status: expense.status,
          updatedAt: expense.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      });
    }
  }

  async reimburseExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, expenseId } = request.params;

      const expense = await this.reimburseExpenseHandler.handle({
        expenseId,
        workspaceId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Expense marked as reimbursed successfully",
        data: {
          expenseId: expense.id.getValue(),
          status: expense.status,
          updatedAt: expense.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      });
    }
  }
}
