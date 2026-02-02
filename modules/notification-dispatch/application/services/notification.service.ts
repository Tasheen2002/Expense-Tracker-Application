import { INotificationRepository } from "../../domain/repositories/notification.repository";
import { INotificationTemplateRepository } from "../../domain/repositories/notification-template.repository";
import { INotificationPreferenceRepository } from "../../domain/repositories/notification-preference.repository";
import { IUserRepository } from "../../../identity-workspace/domain/repositories/user.repository";
import { Notification } from "../../domain/entities/notification.entity";
import { NotificationPreference } from "../../domain/entities/notification-preference.entity";
import { NotificationType } from "../../domain/enums/notification-type.enum";
import { NotificationChannel } from "../../domain/enums/notification-channel.enum";
import { NotificationPriority } from "../../domain/enums/notification-priority.enum";
import { NotificationId } from "../../domain/value-objects/notification-id";
import { UserId, WorkspaceId } from "../../domain/value-objects";
import {
  NotificationNotFoundError,
  UnauthorizedNotificationAccessError,
  NotificationSendFailedError,
} from "../../domain/errors/notification.errors";
import { IChannelProvider } from "../providers/channel-provider.interface";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface SendNotificationParams {
  workspaceId: string;
  recipientId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title?: string;
  content?: string;
  data: Record<string, unknown>;
}

export class NotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly templateRepository: INotificationTemplateRepository,
    private readonly preferenceRepository: INotificationPreferenceRepository,
    private readonly userRepository: IUserRepository,
    private readonly emailProvider?: IChannelProvider,
  ) {}

  async send(params: SendNotificationParams): Promise<Notification[]> {
    const workspaceId = WorkspaceId.fromString(params.workspaceId);
    const recipientId = UserId.fromString(params.recipientId);
    const sentNotifications: Notification[] = [];

    // Get user preferences (or create default)
    let preferences = await this.preferenceRepository.findByUserAndWorkspace(
      recipientId,
      workspaceId,
    );
    if (!preferences) {
      preferences = NotificationPreference.create({
        userId: recipientId,
        workspaceId: workspaceId,
      });
      await this.preferenceRepository.save(preferences);
    }

    // Send via each enabled channel
    const channels: NotificationChannel[] = [
      NotificationChannel.EMAIL,
      NotificationChannel.IN_APP,
    ];

    for (const channel of channels) {
      const channelKey = this.channelToPreferenceKey(channel);
      if (!preferences.isChannelEnabledForType(params.type, channelKey)) {
        continue;
      }

      // Get template for this channel
      const template = await this.templateRepository.findActiveTemplate(
        workspaceId,
        params.type,
        channel,
      );

      if (!template) {
        const useExplicitOrDefault =
          (params.title && params.content) ||
          channel === NotificationChannel.IN_APP;

        if (useExplicitOrDefault) {
          const title = params.title || this.getDefaultTitle(params.type);
          const content =
            params.content || this.getDefaultContent(params.type, params.data);

          const notification = Notification.create({
            workspaceId,
            recipientId,
            type: params.type,
            channel,
            priority: params.priority,
            title,
            content,
            data: params.data,
          });

          // Dispatch based on channel
          try {
            if (channel === NotificationChannel.EMAIL) {
              await this.sendEmail(recipientId.getValue(), title, content);
            }
            notification.markAsSent();
          } catch (error) {
            notification.markAsFailed(
              error instanceof Error ? error.message : "Unknown error",
            );
          }

          await this.notificationRepository.save(notification);
          sentNotifications.push(notification);
        }
        continue;
      }

      // Render template
      const title = this.renderTemplate(
        template.getSubjectTemplate(),
        params.data,
      );
      const content = this.renderTemplate(
        template.getBodyTemplate(),
        params.data,
      );

      const notification = Notification.create({
        workspaceId,
        recipientId,
        type: params.type,
        channel,
        priority: params.priority,
        title,
        content,
        data: params.data,
      });

      // Dispatch based on channel
      try {
        if (channel === NotificationChannel.EMAIL) {
          await this.sendEmail(recipientId.getValue(), title, content);
        }
        notification.markAsSent();
      } catch (error) {
        notification.markAsFailed(
          error instanceof Error ? error.message : "Unknown error",
        );
      }

      await this.notificationRepository.save(notification);
      sentNotifications.push(notification);
    }

    return sentNotifications;
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const id = NotificationId.fromString(notificationId);
    const recipientId = UserId.fromString(userId);
    const notification = await this.notificationRepository.findById(id);

    if (!notification) {
      throw new NotificationNotFoundError(notificationId);
    }

    // Verify the user owns this notification
    if (!notification.getRecipientId().equals(recipientId)) {
      throw new UnauthorizedNotificationAccessError(notificationId, userId);
    }

    notification.markAsRead();
    await this.notificationRepository.save(notification);
    return notification;
  }

  async markAllAsRead(recipientId: string, workspaceId: string): Promise<void> {
    const userId = UserId.fromString(recipientId);
    const wsId = WorkspaceId.fromString(workspaceId);
    await this.notificationRepository.markAllAsRead(userId, wsId);
  }

  async getUnreadNotifications(
    recipientId: string,
    workspaceId: string,
  ): Promise<Notification[]> {
    const userId = UserId.fromString(recipientId);
    const wsId = WorkspaceId.fromString(workspaceId);
    return this.notificationRepository.findUnreadByRecipient(userId, wsId);
  }

  async getNotifications(
    recipientId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Notification>> {
    const userId = UserId.fromString(recipientId);
    const wsId = WorkspaceId.fromString(workspaceId);
    return this.notificationRepository.findByRecipient(userId, wsId, options);
  }

  async getUnreadCount(
    recipientId: string,
    workspaceId: string,
  ): Promise<number> {
    const userId = UserId.fromString(recipientId);
    const wsId = WorkspaceId.fromString(workspaceId);
    return this.notificationRepository.countUnread(userId, wsId);
  }

  async getPreferences(
    userId: string,
    workspaceId: string,
  ): Promise<NotificationPreference | null> {
    const userIdVO = UserId.fromString(userId);
    const wsId = WorkspaceId.fromString(workspaceId);
    return this.preferenceRepository.findByUserAndWorkspace(userIdVO, wsId);
  }

  async updatePreferences(
    userId: string,
    workspaceId: string,
    settings: { email?: boolean; inApp?: boolean; push?: boolean },
  ): Promise<NotificationPreference> {
    const userIdVO = UserId.fromString(userId);
    const wsId = WorkspaceId.fromString(workspaceId);

    let preferences = await this.preferenceRepository.findByUserAndWorkspace(
      userIdVO,
      wsId,
    );
    if (!preferences) {
      preferences = NotificationPreference.create({
        userId: userIdVO,
        workspaceId: wsId,
      });
    }

    preferences.updateGlobalSettings(settings);
    await this.preferenceRepository.save(preferences);
    return preferences;
  }

  // --- Private Helpers ---

  private channelToPreferenceKey(
    channel: NotificationChannel,
  ): "email" | "inApp" | "push" {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return "email";
      case NotificationChannel.IN_APP:
        return "inApp";
      case NotificationChannel.PUSH:
        return "push";
    }
  }

  /**
   * Escape HTML special characters to prevent XSS attacks
   */
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private renderTemplate(
    template: string,
    data: Record<string, unknown>,
  ): string {
    // Simple Mustache-like replacement: {{key}} -> value
    // XSS PROTECTION: Escape all values before inserting
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = data[key];
      if (value === undefined) return "";
      // Escape HTML to prevent XSS attacks
      return this.escapeHtml(String(value));
    });
  }

  private getDefaultTitle(type: NotificationType): string {
    const titles: Record<NotificationType, string> = {
      [NotificationType.EXPENSE_APPROVED]: "Expense Approved",
      [NotificationType.EXPENSE_REJECTED]: "Expense Rejected",
      [NotificationType.APPROVAL_REQUIRED]: "Approval Required",
      [NotificationType.BUDGET_ALERT]: "Budget Alert",
      [NotificationType.INVITATION]: "Workspace Invitation",
      [NotificationType.SYSTEM_ALERT]: "System Alert",
    };
    return titles[type] || "Notification";
  }

  private getDefaultContent(
    type: NotificationType,
    data: Record<string, unknown>,
  ): string {
    // Generate basic content based on type
    switch (type) {
      case NotificationType.EXPENSE_APPROVED:
        return `Your expense "${data.expenseTitle || "Expense"}" has been approved.`;
      case NotificationType.EXPENSE_REJECTED:
        return `Your expense "${data.expenseTitle || "Expense"}" has been rejected. Reason: ${data.reason || "Not specified"}`;
      case NotificationType.APPROVAL_REQUIRED:
        return `You have a pending expense to approve: "${data.expenseTitle || "Expense"}" for ${data.amount || "unknown amount"}.`;
      case NotificationType.BUDGET_ALERT:
        return `Budget alert: ${data.message || "You are approaching your budget limit."}`;
      case NotificationType.INVITATION:
        return `You have been invited to join workspace "${data.workspaceName || "a workspace"}".`;
      default:
        return `You have a new notification.`;
    }
  }

  private async sendEmail(
    recipientId: string,
    subject: string,
    body: string,
  ): Promise<void> {
    if (!this.emailProvider) {
      console.warn(
        `[EMAIL] No email provider configured. Email not sent to: ${recipientId}`,
      );
      return;
    }

    const user = await this.userRepository.findById(
      UserId.fromString(recipientId),
    );

    if (!user) {
      console.warn(`[EMAIL] User not found: ${recipientId}. Email not sent.`);
      return;
    }

    const email = user.getEmail().getValue();

    const result = await this.emailProvider.send({
      recipientId,
      recipientEmail: email,
      subject,
      content: body,
    });

    if (!result.success) {
      throw new NotificationSendFailedError(
        "EMAIL",
        result.error || "Failed to send email",
      );
    }
  }
}
