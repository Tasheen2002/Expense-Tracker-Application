import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';
import { ListNotificationsHandler } from '../../../application/queries/list-notifications.query';
import { GetUnreadCountHandler } from '../../../application/queries/get-unread-count.query';
import { MarkAsReadHandler } from '../../../application/commands/mark-as-read.command';
import { MarkAllAsReadHandler } from '../../../application/commands/mark-all-as-read.command';
import { GetUnreadNotificationsHandler } from '../../../application/queries/get-unread-notifications.query';
import { ListNotificationsQuery } from '../validation/notification.schema';

export class NotificationController {
  constructor(
    private readonly listNotificationsHandler: ListNotificationsHandler,
    private readonly getUnreadCountHandler: GetUnreadCountHandler,
    private readonly getUnreadNotificationsHandler: GetUnreadNotificationsHandler,
    private readonly markAsReadHandler: MarkAsReadHandler,
    private readonly markAllAsReadHandler: MarkAllAsReadHandler
  ) {}

  async getNotifications(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: ListNotificationsQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;
      const userId = request.user.userId;

      const paginatedData = await this.listNotificationsHandler.handle({
        recipientId: userId,
        workspaceId,
        limit,
        offset,
      });
      const unreadCount = await this.getUnreadCountHandler.handle({
        recipientId: userId,
        workspaceId,
      });

      return ResponseHelper.ok(
        reply,
        'Notifications retrieved successfully',
        {
          notifications: paginatedData.items,
          unreadCount,
          pagination: {
            total: paginatedData.total,
            limit: paginatedData.limit,
            offset: paginatedData.offset,
            hasMore: paginatedData.hasMore,
          },
        }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getUnreadNotifications(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const userId = request.user.userId;

      const paginatedData = await this.getUnreadNotificationsHandler.handle({
        recipientId: userId,
        workspaceId,
      });
      return ResponseHelper.ok(
        reply,
        'Unread notifications retrieved successfully',
        {
          notifications: paginatedData.items,
          pagination: {
            total: paginatedData.total,
            limit: paginatedData.limit,
            offset: paginatedData.offset,
            hasMore: paginatedData.hasMore,
          },
        }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async markAsRead(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; notificationId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { notificationId } = request.params;
      const userId = request.user.userId;

      const result = await this.markAsReadHandler.handle({
        notificationId,
        userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Notification marked as read',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async markAllAsRead(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const userId = request.user.userId;

      const result = await this.markAllAsReadHandler.handle({
        recipientId: userId,
        workspaceId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'All notifications marked as read',
        undefined,
        200
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}

