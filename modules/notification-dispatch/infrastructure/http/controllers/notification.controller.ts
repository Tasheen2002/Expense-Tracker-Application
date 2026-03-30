import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';
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

      const listResult = await this.listNotificationsHandler.handle({
        recipientId: userId,
        workspaceId,
        limit: limit ?? 50,
        offset: offset ?? 0,
      });
      const countResult = await this.getUnreadCountHandler.handle({
        recipientId: userId,
        workspaceId,
      });

      const paginatedData = listResult.data;
      return ResponseHelper.fromQuery(
        reply,
        listResult,
        'Notifications retrieved successfully',
        {
          notifications: paginatedData?.items.map((n) => n.toJSON()) ?? [],
          unreadCount: countResult.data ?? 0,
          pagination: {
            total: paginatedData?.total ?? 0,
            limit: paginatedData?.limit ?? 0,
            offset: paginatedData?.offset ?? 0,
            hasMore: paginatedData?.hasMore ?? false,
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

      const result = await this.getUnreadNotificationsHandler.handle({
        recipientId: userId,
        workspaceId,
      });
      const paginatedData = result.data;
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Unread notifications retrieved successfully',
        {
          notifications: paginatedData?.items.map((n) => n.toJSON()) ?? [],
          pagination: {
            total: paginatedData?.total ?? 0,
            limit: paginatedData?.limit ?? 0,
            offset: paginatedData?.offset ?? 0,
            hasMore: paginatedData?.hasMore ?? false,
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
