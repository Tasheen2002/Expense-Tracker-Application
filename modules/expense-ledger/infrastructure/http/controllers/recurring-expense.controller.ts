import { FastifyRequest, FastifyReply } from "fastify";
import { RecurringExpenseService } from "../../../application/services/recurring-expense.service";
import { RecurrenceFrequency } from "../../../domain/enums/recurrence-frequency";
import { ExpenseTemplate } from "../../../domain/entities/recurring-expense.entity";

export class RecurringExpenseController {
  constructor(
    private readonly recurringExpenseService: RecurringExpenseService,
  ) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const { workspaceId, userId } = request.params as {
      workspaceId: string;
      userId: string;
    };
    const body = request.body as {
      frequency: RecurrenceFrequency;
      interval: number;
      startDate: string;
      endDate?: string;
      template: ExpenseTemplate;
    };

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
        data: expense,
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        error: "Bad Request",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create recurring expense",
      });
    }
  }

  async pause(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    try {
      await this.recurringExpenseService.pauseRecurringExpense(id);
      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Recurring expense paused",
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message:
          error instanceof Error
            ? error.message
            : "Failed to pause recurring expense",
      });
    }
  }

  async resume(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    try {
      await this.recurringExpenseService.resumeRecurringExpense(id);
      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Recurring expense resumed",
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message:
          error instanceof Error
            ? error.message
            : "Failed to resume recurring expense",
      });
    }
  }

  async stop(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    try {
      await this.recurringExpenseService.stopRecurringExpense(id);
      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Recurring expense stopped",
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message:
          error instanceof Error
            ? error.message
            : "Failed to stop recurring expense",
      });
    }
  }

  async trigger(request: FastifyRequest, reply: FastifyReply) {
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
    } catch (error) {
      return reply.status(500).send({
        success: false,
        statusCode: 500,
        error: "Internal Server Error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to process recurring expenses",
      });
    }
  }
}
