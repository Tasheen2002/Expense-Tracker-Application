import { FastifyRequest, FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { RecurringExpenseService } from "../../../application/services/recurring-expense.service";
import { RecurrenceFrequency } from "../../../domain/enums/recurrence-frequency";
import { ExpenseTemplate } from "../../../domain/entities/recurring-expense.entity";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

export class RecurringExpenseController {
  constructor(
    private readonly recurringExpenseService: RecurringExpenseService,
  ) {}

  async create(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        frequency: RecurrenceFrequency;
        interval: number;
        startDate: string;
        endDate?: string;
        template: ExpenseTemplate;
      };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId } = request.params;
    const userId = request.user.userId;
    if (!userId) {
      return ResponseHelper.unauthorized(reply);
    }
    const body = request.body;

    // Basic validation
    // Ideally we use a schema validator (zod/ajv) attached to the route

    try {
      const expense = await this.recurringExpenseService.createRecurringExpense(
        {
          workspaceId,
          userId,
          frequency: body.frequency,
          interval: body.interval,
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          template: body.template,
        },
      );

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Recurring expense created successfully",
        data: {
          id: expense.id,
          workspaceId: expense.workspaceId,
          userId: expense.userId,
          frequency: expense.frequency,
          interval: expense.interval,
          startDate: expense.startDate.toISOString(),
          endDate: expense.endDate?.toISOString(),
          nextRunDate: expense.nextRunDate.toISOString(),
          status: expense.status,
          template: expense.template,
          createdAt: expense.createdAt.toISOString(),
          updatedAt: expense.updatedAt.toISOString(),
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async pause(
    request: AuthenticatedRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply,
  ) {
    const { id } = request.params;

    try {
      await this.recurringExpenseService.pauseRecurringExpense(id);
      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Recurring expense paused",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async resume(
    request: AuthenticatedRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply,
  ) {
    const { id } = request.params;

    try {
      await this.recurringExpenseService.resumeRecurringExpense(id);
      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Recurring expense resumed",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async stop(
    request: AuthenticatedRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply,
  ) {
    const { id } = request.params;

    try {
      await this.recurringExpenseService.stopRecurringExpense(id);
      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Recurring expense stopped",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async trigger(request: AuthenticatedRequest, reply: FastifyReply) {
    // This endpoint should be secured by a system API key
    // For now, we assume middleware handles auth or it's internal

    try {
      const processedCount =
        await this.recurringExpenseService.processDueExpenses();
      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: `Processed ${processedCount} recurring expenses`,
        data: { count: processedCount },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
