import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';
import { ListNotificationsHandler } from '../../../application/queries/list-notifications.query';
import { GetUnreadCountHandler } from '../../../application/queries/get-unread-count.query';
import { MarkAsReadHandler } from '../../../application/commands/mark-as-read.command';
import { MarkAllAsReadHandler } from '../../../application/commands/mark-all-as-read.command';
import { GetUnreadNotificationsHandler } from '../../../application/queries/get-unread-notifications.query';

export class NotificationController {
  constructor(
    private readonly listNotificationsHandler: ListNotificationsHandler,
    private readonly getUnreadCountHandler: GetUnreadCountHandler,
    private readonly getUnreadNotificationsHandler: GetUnreadNotificationsHandler,
    private readonly markAsReadHandler: MarkAsReadHandler,
    private readonly markAllAsReadHandler: MarkAllAsReadHandler
  ) {}

  async getNotifications(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const { limit, offset } = request.query as {
        limit?: number;
        offset?: number;
      };
      const userId = request.user.userId;

      const paginatedData = await this.listNotificationsHandler.handle({
        recipientId: userId,
        workspaceId,
        limit: limit ?? 50,
        offset: offset ?? 0,
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
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getUnreadNotifications(
    request: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
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
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async markAsRead(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { notificationId } = request.params as { notificationId: string };
      const userId = request.user.userId;

      const result = await this.markAsReadHandler.handle({
        notificationId,
        userId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Notification marked as read'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async markAllAsRead(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const userId = request.user.userId;

      const result = await this.markAllAsReadHandler.handle({
        recipientId: userId,
        workspaceId,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'All notifications marked as read'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
