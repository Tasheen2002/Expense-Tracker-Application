import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { ResponseHelper } from '@shared/response.helper';
import { ListAccountNotificationsHandler } from '../../../application/queries/list-account-notifications.query';
import { GetAccountNotificationPreferencesHandler } from '../../../application/queries/get-account-notification-preferences.query';
import { MarkAccountNotificationReadHandler } from '../../../application/commands/mark-account-notification-read.command';
import { UpdateAccountNotificationPreferencesHandler } from '../../../application/commands/update-account-notification-preferences.command';
import {
  AccountNotificationQuery,
  AccountPreferenceBody,
  AccountNotificationParams,
} from '../validation/account-notification.schema';

export class AccountNotificationController {
  constructor(
    private readonly listAccountNotificationsHandler: Pick<
      ListAccountNotificationsHandler,
      'handle'
    >,
    private readonly markAccountNotificationReadHandler: Pick<
      MarkAccountNotificationReadHandler,
      'handle'
    >,
    private readonly getAccountNotificationPreferencesHandler: Pick<
      GetAccountNotificationPreferencesHandler,
      'handle'
    >,
    private readonly updateAccountNotificationPreferencesHandler: Pick<
      UpdateAccountNotificationPreferencesHandler,
      'handle'
    >
  ) {}

  async list(
    request: AuthenticatedRequest<{ Querystring: AccountNotificationQuery }>,
    reply: FastifyReply
  ) {
    try {
      const result = await this.listAccountNotificationsHandler.handle({
        actorId: request.user.userId,
        limit: request.query.limit,
        offset: request.query.offset,
      });
      return ResponseHelper.ok(
        reply,
        'Account notifications retrieved',
        result
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async markRead(
    request: AuthenticatedRequest<{ Params: AccountNotificationParams }>,
    reply: FastifyReply
  ) {
    try {
      const result = await this.markAccountNotificationReadHandler.handle({
        actorId: request.user.userId,
        notificationId: request.params.notificationId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Account notification marked as read'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getPreferences(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const result = await this.getAccountNotificationPreferencesHandler.handle(
        { actorId: request.user.userId }
      );
      return ResponseHelper.ok(reply, 'Account preferences retrieved', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async setPreferences(
    request: AuthenticatedRequest<{ Body: AccountPreferenceBody }>,
    reply: FastifyReply
  ) {
    try {
      const result =
        await this.updateAccountNotificationPreferencesHandler.handle({
          actorId: request.user.userId,
          settings: request.body,
        });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Account preferences updated'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
