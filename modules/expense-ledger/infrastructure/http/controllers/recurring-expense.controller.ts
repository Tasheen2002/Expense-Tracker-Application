import { FastifyReply } from "fastify";
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

    try {
      const expense = await this.recurringExpenseService.createRecurringExpense({
        workspaceId,
        userId,
        frequency: body.frequency,
        interval: body.interval,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        template: body.template,
      });

      return ResponseHelper.created(reply, "Recurring expense created successfully", {
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
      return ResponseHelper.ok(reply, "Recurring expense paused");
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
      return ResponseHelper.ok(reply, "Recurring expense resumed");
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
      return ResponseHelper.ok(reply, "Recurring expense stopped");
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async trigger(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const processedCount =
        await this.recurringExpenseService.processDueExpenses();
      return ResponseHelper.ok(
        reply,
        `Processed ${processedCount} recurring expenses`,
        { count: processedCount },
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
