import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
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

import crypto from 'node:crypto';

function timingSafeCompare(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

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
          tagIds: body.template.tagIds ?? undefined,
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
    const { id, workspaceId } = request.params;

    try {
      const result = await this.pauseRecurringExpenseHandler.handle({
        id,
        workspaceId,
        userId: request.user.userId,
      });
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
    const { id, workspaceId } = request.params;

    try {
      const result = await this.resumeRecurringExpenseHandler.handle({
        id,
        workspaceId,
        userId: request.user.userId,
      });
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
    const { id, workspaceId } = request.params;

    try {
      const result = await this.stopRecurringExpenseHandler.handle({
        id,
        workspaceId,
        userId: request.user.userId,
      });
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
    request: AuthenticatedRequest<{ Body?: RecurringTriggerInput }>,
    reply: FastifyReply
  ) {
    const expectedSecret = process.env.INTERNAL_API_KEY || process.env.CRON_SECRET;
    const incomingHeaderSecret =
      (request.headers['x-internal-api-key'] as string | undefined) ||
      (request.headers['x-cron-secret'] as string | undefined);

    if (!expectedSecret || !incomingHeaderSecret || !timingSafeCompare(incomingHeaderSecret, expectedSecret)) {
      return ResponseHelper.forbidden(
        reply,
        'Invalid or missing internal authorization credentials'
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
