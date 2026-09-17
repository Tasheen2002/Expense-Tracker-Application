import { NotificationType } from '../enums/notification-type.enum';
import { PreferenceId } from '../value-objects/preference-id';
import { UserId, WorkspaceId } from '../value-objects';
import { AggregateRoot } from '@core/domain/aggregate-root';

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
  get typeSettings(): Record<string, TypeSettingValue> { return this.props.typeSettings; }

  isChannelEnabledForType(
    type: NotificationType,
    channel: 'email' | 'inApp' | 'push'
  ): boolean {
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
    if (settings.email !== undefined) this.props.emailEnabled = settings.email;
    if (settings.inApp !== undefined) this.props.inAppEnabled = settings.inApp;
    if (settings.push !== undefined) this.props.pushEnabled = settings.push;
    this.props.updatedAt = new Date();
  }

  updateTypeSetting(type: NotificationType, settings: TypeSettingValue): void {
    if (!this.props.typeSettings[type]) {
      this.props.typeSettings[type] = {};
    }

    const current = this.props.typeSettings[type];
    this.props.typeSettings[type] = { ...current, ...settings };
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
}
