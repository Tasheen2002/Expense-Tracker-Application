import { FastifyRequest, FastifyReply } from "fastify";
import { NotificationService } from "../../../application/services/notification.service";
import { Notification } from "../../../domain/entities/notification.entity";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  async getNotifications(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;
      const userId = (request as any).user?.id;

      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const notifications = await this.notificationService.getNotifications(
        userId,
        workspaceId,
        {
          limit: limit ? parseInt(limit, 10) : 50,
          offset: offset ? parseInt(offset, 10) : 0,
        },
      );

      const unreadCount = await this.notificationService.getUnreadCount(
        userId,
        workspaceId,
      );

      return ResponseHelper.success(
        reply,
        200,
        "Notifications retrieved successfully",
        {
          notifications: notifications.map((n) =>
            this.serializeNotification(n),
          ),
          unreadCount,
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async markAsRead(
    request: FastifyRequest<{
      Params: { workspaceId: string; notificationId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { notificationId } = request.params;

      const notification =
        await this.notificationService.markAsRead(notificationId);

      return ResponseHelper.success(
        reply,
        200,
        "Notification marked as read",
        this.serializeNotification(notification),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async markAllAsRead(
    request: FastifyRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const userId = (request as any).user?.id;

      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      await this.notificationService.markAllAsRead(userId, workspaceId);

      return ResponseHelper.success(
        reply,
        200,
        "All notifications marked as read",
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getPreferences(
    request: FastifyRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const userId = (request as any).user?.id;

      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const preferences = await this.notificationService.getPreferences(
        userId,
        workspaceId,
      );

      return ResponseHelper.success(
        reply,
        200,
        "Preferences retrieved successfully",
        preferences
          ? {
              emailEnabled: preferences.isEmailEnabled(),
              inAppEnabled: preferences.isInAppEnabled(),
              pushEnabled: preferences.isPushEnabled(),
            }
          : {
              emailEnabled: true,
              inAppEnabled: true,
              pushEnabled: false,
            },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updatePreferences(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Body: { email?: boolean; inApp?: boolean; push?: boolean };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { email, inApp, push } = request.body;
      const userId = (request as any).user?.id;

      if (!userId) {
        return ResponseHelper.unauthorized(reply);
      }

      const preferences = await this.notificationService.updatePreferences(
        userId,
        workspaceId,
        { email, inApp, push },
      );

      return ResponseHelper.success(
        reply,
        200,
        "Preferences updated successfully",
        {
          emailEnabled: preferences.isEmailEnabled(),
          inAppEnabled: preferences.isInAppEnabled(),
          pushEnabled: preferences.isPushEnabled(),
        },
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  private serializeNotification(notification: Notification) {
    return {
      id: notification.getId().getValue(),
      type: notification.getType(),
      channel: notification.getChannel(),
      priority: notification.getPriority(),
      title: notification.getTitle(),
      content: notification.getContent(),
      data: notification.getData(),
      status: notification.getStatus(),
      isRead: notification.isRead(),
      readAt: notification.getReadAt()?.toISOString() || null,
      sentAt: notification.getSentAt()?.toISOString() || null,
      createdAt: notification.getCreatedAt().toISOString(),
    };
  }
}
