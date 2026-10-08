import sanitizeHtml from 'sanitize-html';
import { validateEnum, validateText } from '../../domain/entities/entity-validation';
import { NOTIFICATION_TITLE_MAX_LENGTH, NOTIFICATION_CONTENT_MAX_LENGTH } from '../../domain/constants';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import { INotificationRepository } from '../../domain/repositories/notification.repository';
import { INotificationTemplateRepository } from '../../domain/repositories/notification-template.repository';
import { INotificationPreferenceRepository } from '../../domain/repositories/notification-preference.repository';
import { Notification, NotificationDTO } from '../../domain/entities/notification.entity';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { NotificationChannel } from '../../domain/enums/notification-channel.enum';
import { NotificationPriority } from '../../domain/enums/notification-priority.enum';
import { NotificationId } from '../../domain/value-objects/notification-id';
import { UserId, WorkspaceId } from '../../domain/value-objects';
import {
  InvalidNotificationDataError,
  NotificationTemplateNotFoundError,
} from '../../domain/errors/notification.errors';

import { DEFAULT_CHANNELS } from '../../domain/constants';
import { requestFingerprint } from './request-fingerprint';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface SendNotificationParams {
  /** Required for durable internal commands; reuse for retries of the same input. */
  requestId: string;
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
    private readonly preferenceRepository: INotificationPreferenceRepository
  ) {}

  /** Trusted internal use case. Public reads derive recipient IDs from authentication. */
  async send(params: SendNotificationParams): Promise<NotificationDTO[]> {
    const workspaceId = WorkspaceId.fromString(params.workspaceId);
    const recipientId = UserId.fromString(params.recipientId);
    validateEnum('type', params.type, Object.values(NotificationType));
    if (params.priority !== undefined) validateEnum('priority', params.priority, Object.values(NotificationPriority));
    if (!params.data || typeof params.data !== 'object' || Array.isArray(params.data)) {
      throw new InvalidNotificationDataError('data', 'must be an object');
    }
    try {
      const serializedData = JSON.stringify(params.data, (_key, value: unknown) => {
        if (value === undefined || typeof value === 'function' || typeof value === 'symbol'
          || typeof value === 'bigint' || (typeof value === 'number' && !Number.isFinite(value))) {
          throw new Error('Unsupported JSON value');
        }
        return value;
      });
      // Capture the validated request before any await. A caller retaining the
      // input object must not change recipient, content or data mid-delivery.
      params = { ...params, data: JSON.parse(serializedData) as Record<string, unknown> };
    } catch {
      throw new InvalidNotificationDataError('data', 'must contain finite, serializable JSON values');
    }
    if (params.title !== undefined) validateText('title', params.title, NOTIFICATION_TITLE_MAX_LENGTH);
    if (params.content !== undefined) validateText('content', params.content, NOTIFICATION_CONTENT_MAX_LENGTH);
    const request = {
      id: NotificationId.fromString(params.requestId).getValue(),
      workspaceId: workspaceId.getValue(), recipientId: recipientId.getValue(),
      fingerprint: requestFingerprint({ workspaceId: workspaceId.getValue(), recipientId: recipientId.getValue(),
        type: params.type, priority: params.priority ?? NotificationPriority.MEDIUM,
        title: params.title, content: params.content, data: params.data }),
    };
    const previous = await this.notificationRepository.findRequest(request);
    if (previous !== null) return previous.map(Notification.toDTO);
    let preferences = await this.preferenceRepository.findByUserAndWorkspace(recipientId, workspaceId);
    // Defaults are a read-only snapshot; sending must not create preference records.
    preferences ??= NotificationPreference.create({ userId: recipientId, workspaceId });
    const planned: { notification: Notification; missingEmailTemplate: boolean }[] = [];
    for (const channel of DEFAULT_CHANNELS) {
      if (!preferences.isChannelEnabledForType(params.type, this.channelToPreferenceKey(channel))) continue;
      const template = await this.templateRepository.findActiveTemplate(workspaceId, params.type, channel);
      const title = template ? this.renderTemplate(template.subjectTemplate, params.data, false)
        : params.title ?? this.getDefaultTitle(params.type);
      const rawContent = template ? this.renderTemplate(template.bodyTemplate, params.data, true)
        : params.content ?? this.getDefaultContent(params.type, params.data);
      // Sanitize after interpolation too: an escaped value can still contain a
      // dangerous URL scheme in an attribute placeholder.
      const content = sanitizeHtml(rawContent, { allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt', 'width', 'height'] } });
      const notification = Notification.create({ workspaceId, recipientId, type: params.type,
        channel, priority: params.priority, title, content, data: params.data });
      if (channel === NotificationChannel.IN_APP) notification.markAsSent();
      planned.push({ notification, missingEmailTemplate: channel === NotificationChannel.EMAIL && !template
        && (params.title === undefined || params.content === undefined) });
    }
    // Validate every channel before persisting anything or calling a provider.
    for (const item of planned) {
      if (item.missingEmailTemplate) item.notification.markAsFailed(
        new NotificationTemplateNotFoundError(params.type, item.notification.channel).message);
    }
    const records = await this.notificationRepository.saveRequest(request, planned.map(item => item.notification));
    return records.map(Notification.toDTO);
  }

  async markAsRead(notificationId: string, userId: string, workspaceId: string): Promise<NotificationDTO> {
    const notification = await this.notificationRepository.mutate(NotificationId.fromString(notificationId),
      UserId.fromString(userId), WorkspaceId.fromString(workspaceId), entity => entity.markAsRead());
    return Notification.toDTO(notification);
  }
  async markAllAsRead(recipientId: string, workspaceId: string): Promise<void> {
    const userId = UserId.fromString(recipientId);
    const wsId = WorkspaceId.fromString(workspaceId);
    await this.notificationRepository.markAllAsRead(userId, wsId);
  }

  async getUnreadNotifications(
    recipientId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<NotificationDTO>> {
    this.validatePagination(options);
    const userId = UserId.fromString(recipientId);
    const wsId = WorkspaceId.fromString(workspaceId);
    const result = await this.notificationRepository.findUnreadByRecipient(
      userId,
      wsId,
      options
    );
    return { ...result, items: result.items.map((n) => Notification.toDTO(n)) };
  }

  async getNotifications(
    recipientId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<NotificationDTO>> {
    this.validatePagination(options);
    const userId = UserId.fromString(recipientId);
    const wsId = WorkspaceId.fromString(workspaceId);
    const result = await this.notificationRepository.findByRecipient(userId, wsId, options);
    return { ...result, items: result.items.map((n) => Notification.toDTO(n)) };
  }

  async getUnreadCount(
    recipientId: string,
    workspaceId: string
  ): Promise<number> {
    const userId = UserId.fromString(recipientId);
    const wsId = WorkspaceId.fromString(workspaceId);
    return this.notificationRepository.countUnread(userId, wsId);
  }

  // --- Private Helpers ---

  private validatePagination(options?: PaginationOptions): void {
    if (options?.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100)) {
      throw new InvalidNotificationDataError('limit', 'must be an integer between 1 and 100');
    }
    if (options?.offset !== undefined && (!Number.isInteger(options.offset) || options.offset < 0 || options.offset > 2147483647)) {
      throw new InvalidNotificationDataError('offset', 'must be a nonnegative PostgreSQL integer');
    }
  }

  private channelToPreferenceKey(
    channel: NotificationChannel
  ): 'email' | 'inApp' | 'push' {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return 'email';
      case NotificationChannel.IN_APP:
        return 'inApp';
      case NotificationChannel.PUSH:
        return 'push';
    }
  }

  /**
   * Escape HTML special characters to prevent XSS attacks
   */
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private renderTemplate(
    template: string,
    data: Record<string, unknown>,
    html: boolean
  ): string {
    // Simple Mustache-like replacement: {{key}} -> value
    // XSS PROTECTION: Escape all values before inserting
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = Object.prototype.hasOwnProperty.call(data, key) ? data[key] : undefined;
      if (value === undefined || value === null || !['string', 'number', 'boolean'].includes(typeof value)) {
        throw new InvalidNotificationDataError('data', `missing or invalid template variable '${key}'`);
      }
      // Escape HTML to prevent XSS attacks
      return html ? this.escapeHtml(String(value)) : String(value);
    });
  }

  private getDefaultTitle(type: NotificationType): string {
    const titles: Record<NotificationType, string> = {
      [NotificationType.EXPENSE_APPROVED]: 'Expense Approved',
      [NotificationType.EXPENSE_REJECTED]: 'Expense Rejected',
      [NotificationType.APPROVAL_REQUIRED]: 'Approval Required',
      [NotificationType.BUDGET_ALERT]: 'Budget Alert',
      [NotificationType.INVITATION]: 'Workspace Invitation',
      [NotificationType.SYSTEM_ALERT]: 'System Alert',
    };
    return titles[type] || 'Notification';
  }

  private getDefaultContent(
    type: NotificationType,
    data: Record<string, unknown>
  ): string {
    const escaped = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, this.escapeHtml(String(value))]));
    data = escaped;
    // Generate basic content based on type
    switch (type) {
      case NotificationType.EXPENSE_APPROVED:
        return `Your expense "${data.expenseTitle || 'Expense'}" has been approved.`;
      case NotificationType.EXPENSE_REJECTED:
        return `Your expense "${data.expenseTitle || 'Expense'}" has been rejected. Reason: ${data.reason || 'Not specified'}`;
      case NotificationType.APPROVAL_REQUIRED:
        return `You have a pending expense to approve: "${data.expenseTitle || 'Expense'}" for ${data.amount || 'unknown amount'}.`;
      case NotificationType.BUDGET_ALERT:
        return `Budget alert: ${data.message || 'You are approaching your budget limit.'}`;
      case NotificationType.INVITATION:
        return `You have been invited to join workspace "${data.workspaceName || 'a workspace'}".`;
      default:
        return `You have a new notification.`;
    }
  }

}
