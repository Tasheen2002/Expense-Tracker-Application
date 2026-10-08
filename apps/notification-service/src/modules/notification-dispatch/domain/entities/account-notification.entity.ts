import { UserId, NotificationId } from '../value-objects';
import { InvalidNotificationDataError } from '../errors/notification.errors';

export const ACCOUNT_NOTIFICATION_MESSAGES = {
  'identity.user_created': [
    'Welcome to Expense Tracker',
    'Your account has been created successfully.',
  ],
  'identity.user_email_verified': [
    'Email verified',
    'Your account email has been verified.',
  ],
  'identity.user_password_changed': [
    'Password changed',
    'Your account password has been changed.',
  ],
  'identity.user_email_changed': [
    'Email changed',
    'Your account email has been changed.',
  ],
  'identity.user_deactivated': [
    'Account deactivated',
    'Your account has been deactivated.',
  ],
  'identity.user_activated': [
    'Account activated',
    'Your account has been activated.',
  ],
  'identity.user_profile_updated': [
    'Profile updated',
    'Your account profile has been updated.',
  ],
} as const;
export interface AccountNotificationSettings {
  inAppEnabled: boolean;
  typeSettings: Record<string, boolean>;
}
export function validateAccountNotificationSettings(
  data: AccountNotificationSettings
): AccountNotificationSettings {
  if (
    typeof data.inAppEnabled !== 'boolean' ||
    !data.typeSettings ||
    typeof data.typeSettings !== 'object' ||
    Array.isArray(data.typeSettings) ||
    Object.entries(data.typeSettings).some(
      ([key, value]) =>
        !Object.prototype.hasOwnProperty.call(
          ACCOUNT_NOTIFICATION_MESSAGES,
          key
        ) || typeof value !== 'boolean'
    )
  ) {
    throw new InvalidNotificationDataError(
      'preferences',
      'invalid account notification settings'
    );
  }
  return {
    inAppEnabled: data.inAppEnabled,
    typeSettings: { ...data.typeSettings },
  };
}
export interface AccountNotificationData {
  id: string;
  userId: string;
  eventType: string;
  title: string;
  content: string;
  createdAt: Date;
  readAt: Date | null;
}
export class AccountNotification {
  private constructor(private readonly props: AccountNotificationData) {}
  static create(
    id: string,
    userId: string,
    eventType: string,
    createdAt: Date
  ): AccountNotification {
    if (
      !Object.prototype.hasOwnProperty.call(
        ACCOUNT_NOTIFICATION_MESSAGES,
        eventType
      )
    )
      throw new InvalidNotificationDataError(
        'eventType',
        'unsupported account lifecycle event'
      );
    const [title, content] =
      ACCOUNT_NOTIFICATION_MESSAGES[
        eventType as keyof typeof ACCOUNT_NOTIFICATION_MESSAGES
      ];
    return this.reconstitute({
      id,
      userId,
      eventType,
      title,
      content,
      createdAt,
      readAt: null,
    });
  }
  static reconstitute(data: AccountNotificationData): AccountNotification {
    if (
      !NotificationId.isValid(data.id) ||
      !UserId.isValid(data.userId) ||
      !Object.prototype.hasOwnProperty.call(
        ACCOUNT_NOTIFICATION_MESSAGES,
        data.eventType
      ) ||
      !data.title.trim() ||
      data.title.length > 255 ||
      !data.content.trim() ||
      !Number.isFinite(data.createdAt.getTime()) ||
      (data.readAt && !Number.isFinite(data.readAt.getTime()))
    ) {
      throw new InvalidNotificationDataError(
        'accountNotification',
        'invalid fields'
      );
    }
    return new AccountNotification({
      ...data,
      id: data.id.toLowerCase(),
      userId: data.userId.toLowerCase(),
      createdAt: new Date(data.createdAt),
      readAt: data.readAt ? new Date(data.readAt) : null,
    });
  }
  markRead(at = new Date()): boolean {
    if (!Number.isFinite(at.getTime()))
      throw new InvalidNotificationDataError('readAt', 'invalid date');
    if (this.props.readAt) return false;
    this.props.readAt = new Date(at);
    return true;
  }
  snapshot(): AccountNotificationData {
    return {
      ...this.props,
      createdAt: new Date(this.props.createdAt),
      readAt: this.props.readAt ? new Date(this.props.readAt) : null,
    };
  }
  toDTO() {
    const data = this.snapshot();
    return {
      ...data,
      scope: 'account' as const,
      channel: 'IN_APP' as const,
      createdAt: data.createdAt.toISOString(),
      readAt: data.readAt?.toISOString() ?? null,
    };
  }
}
