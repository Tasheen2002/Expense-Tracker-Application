import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  CreateRecurringExpenseHandler,
  PauseRecurringExpenseHandler,
  ResumeRecurringExpenseHandler,
  StopRecurringExpenseHandler,
  ProcessRecurringExpensesHandler,
} from '../../../application';
import { ResponseHelper } from '@shared/response.helper';
import {
  CreateRecurringExpenseInput,
  RecurringTriggerInput,
} from '../validation/recurring-expense.schema';

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
      Body: CreateRecurringExpenseInput;
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
        template: {
          ...body.template,
          tagIds: body.template.categoryId ? [] : undefined, // Maintain template structure
        },
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Recurring expense created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async pause(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; id: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;

    try {
      const result = await this.pauseRecurringExpenseHandler.handle({ id });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Recurring expense paused',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async resume(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; id: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;

    try {
      const result = await this.resumeRecurringExpenseHandler.handle({ id });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Recurring expense resumed',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async stop(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; id: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;

    try {
      const result = await this.stopRecurringExpenseHandler.handle({ id });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Recurring expense stopped',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async trigger(
    request: AuthenticatedRequest<{ Body: RecurringTriggerInput }>,
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
