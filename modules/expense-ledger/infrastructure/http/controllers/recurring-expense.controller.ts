import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateRecurringExpenseHandler } from '../../../application/commands/create-recurring-expense.command';
import { PauseRecurringExpenseHandler } from '../../../application/commands/pause-recurring-expense.command';
import { ResumeRecurringExpenseHandler } from '../../../application/commands/resume-recurring-expense.command';
import { StopRecurringExpenseHandler } from '../../../application/commands/stop-recurring-expense.command';
import { ProcessRecurringExpensesHandler } from '../../../application/commands/process-recurring-expenses.command';
import { RecurrenceFrequency } from '../../../domain/enums/recurrence-frequency';
import { ExpenseTemplate } from '../../../domain/entities/recurring-expense.entity';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

export class RecurringExpenseController {
  constructor(
    private readonly createRecurringExpenseHandler: CreateRecurringExpenseHandler,
    private readonly pauseRecurringExpenseHandler: PauseRecurringExpenseHandler,
    private readonly resumeRecurringExpenseHandler: ResumeRecurringExpenseHandler,
    private readonly stopRecurringExpenseHandler: StopRecurringExpenseHandler,
    private readonly processRecurringExpensesHandler: ProcessRecurringExpensesHandler
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
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;
    const userId = request.user.userId;
    if (!userId) {
      return ResponseHelper.unauthorized(reply);
    }
    const body = request.body;

    try {
      const result = await this.createRecurringExpenseHandler.handle({
        workspaceId,
        userId,
        frequency: body.frequency,
        interval: body.interval,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        template: body.template,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Recurring expense created successfully',
        result.data?.toJSON(),
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async pause(
    request: AuthenticatedRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;

    try {
      const result = await this.pauseRecurringExpenseHandler.handle({ id });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Recurring expense paused'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async resume(
    request: AuthenticatedRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;

    try {
      const result = await this.resumeRecurringExpenseHandler.handle({ id });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Recurring expense resumed'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async stop(
    request: AuthenticatedRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;

    try {
      const result = await this.stopRecurringExpenseHandler.handle({ id });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Recurring expense stopped'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async trigger(
    request: AuthenticatedRequest<{ Body: { secret?: string } }>,
    reply: FastifyReply
  ) {
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret || request.body?.secret !== expectedSecret) {
      return ResponseHelper.forbidden(
        reply,
        'Invalid or missing trigger secret'
      );
    }
    try {
      const result = await this.processRecurringExpensesHandler.handle({});
      return ResponseHelper.fromCommand(
        reply,
        result,
        `Processed ${result.data?.count ?? 0} recurring expenses`,
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
