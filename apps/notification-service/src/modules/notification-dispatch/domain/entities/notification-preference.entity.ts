import { NotificationType } from '../enums/notification-type.enum';
import { PreferenceId } from '../value-objects/preference-id';
import { UserId, WorkspaceId } from '../value-objects';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { copyDate, validateEnum } from './entity-validation';
import { InvalidNotificationDataError } from '../errors/notification.errors';

function validateSettings(settings: TypeSettingValue): void {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new InvalidNotificationDataError('settings', 'must be an object');
  }
  for (const [key, value] of Object.entries(settings)) {
    if (!['email', 'inApp', 'push'].includes(key) || (value !== undefined && typeof value !== 'boolean')) {
      throw new InvalidNotificationDataError('settings', 'only boolean email, inApp and push values are supported');
    }
  }
}

export interface TypeSettingValue {
  email?: boolean;
  inApp?: boolean;
  push?: boolean;
}

export interface NotificationPreferenceProps {
  id: PreferenceId;
  userId: UserId;
  workspaceId: WorkspaceId;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  typeSettings: Record<string, TypeSettingValue>;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationPreference extends AggregateRoot {
  private constructor(private props: NotificationPreferenceProps) {
    super();
    this.props = { ...props, typeSettings: structuredClone(props.typeSettings),
      createdAt: copyDate(props.createdAt), updatedAt: copyDate(props.updatedAt) };
  }

  static create(params: {
    userId: UserId;
    workspaceId: WorkspaceId;
  }): NotificationPreference {
    return new NotificationPreference({
      id: PreferenceId.create(),
      userId: params.userId,
      workspaceId: params.workspaceId,
      emailEnabled: true,
      inAppEnabled: true,
      pushEnabled: false,
      typeSettings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(
    props: NotificationPreferenceProps
  ): NotificationPreference {
    return new NotificationPreference(props);
  }

  get id(): PreferenceId { return this.props.id; }
  get userId(): UserId { return this.props.userId; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get emailEnabled(): boolean { return this.props.emailEnabled; }
  get inAppEnabled(): boolean { return this.props.inAppEnabled; }
  get pushEnabled(): boolean { return this.props.pushEnabled; }
  get typeSettings(): Record<string, TypeSettingValue> { return structuredClone(this.props.typeSettings); }
  get createdAt(): Date { return copyDate(this.props.createdAt); }
  get updatedAt(): Date { return copyDate(this.props.updatedAt); }

  isChannelEnabledForType(
    type: NotificationType,
    channel: 'email' | 'inApp' | 'push'
  ): boolean {
    validateEnum('type', type, Object.values(NotificationType));
    validateEnum('channel', channel, ['email', 'inApp', 'push']);
    // Global switch check
    if (channel === 'email' && !this.props.emailEnabled) return false;
    if (channel === 'inApp' && !this.props.inAppEnabled) return false;
    if (channel === 'push' && !this.props.pushEnabled) return false;

    // Granular type check
    const typeSetting = this.props.typeSettings[type];
    if (typeSetting && typeSetting[channel] !== undefined) {
      return typeSetting[channel]!;
    }

    // Default to true if no granular setting exists
    return true;
  }

  updateGlobalSettings(settings: {
    email?: boolean;
    inApp?: boolean;
    push?: boolean;
  }): void {
    validateSettings(settings);
    if ((settings.email === undefined || settings.email === this.props.emailEnabled)
      && (settings.inApp === undefined || settings.inApp === this.props.inAppEnabled)
      && (settings.push === undefined || settings.push === this.props.pushEnabled)) return;
    if (settings.email !== undefined) this.props.emailEnabled = settings.email;
    if (settings.inApp !== undefined) this.props.inAppEnabled = settings.inApp;
    if (settings.push !== undefined) this.props.pushEnabled = settings.push;
    this.props.updatedAt = new Date();
  }

  updateTypeSetting(type: NotificationType, settings: TypeSettingValue): void {
    validateEnum('type', type, Object.values(NotificationType));
    validateSettings(settings);
    const current = this.props.typeSettings[type] ?? {};
    const changes = Object.entries(settings).filter(([, value]) => value !== undefined);
    if (changes.every(([key, value]) => current[key as keyof TypeSettingValue] === value)) return;
    this.props.typeSettings[type] = { ...current, ...Object.fromEntries(changes) };
    this.props.updatedAt = new Date();
  }

  static toDTO(pref: NotificationPreference): NotificationPreferenceDTO {
    return {
      id: pref.id.getValue(),
      userId: pref.userId.getValue(),
      workspaceId: pref.workspaceId.getValue(),
      emailEnabled: pref.emailEnabled,
      inAppEnabled: pref.inAppEnabled,
      pushEnabled: pref.pushEnabled,
      typeSettings: pref.typeSettings,
    };
  }
}

export interface NotificationPreferenceDTO {
  id: string;
  userId: string;
  workspaceId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  typeSettings: Record<string, TypeSettingValue>;
}
