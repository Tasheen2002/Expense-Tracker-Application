import { NotificationType } from "../enums/notification-type.enum";
import { PreferenceId } from "../value-objects/preference-id";
import { UserId, WorkspaceId } from "../value-objects";

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

export class NotificationPreference {
  private props: NotificationPreferenceProps;

  private constructor(props: NotificationPreferenceProps) {
    this.props = props;
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

  static reconstitute(
    props: NotificationPreferenceProps,
  ): NotificationPreference {
    return new NotificationPreference(props);
  }

  getId(): PreferenceId {
    return this.props.id;
  }

  getUserId(): UserId {
    return this.props.userId;
  }

  getWorkspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  isEmailEnabled(): boolean {
    return this.props.emailEnabled;
  }

  isInAppEnabled(): boolean {
    return this.props.inAppEnabled;
  }

  isPushEnabled(): boolean {
    return this.props.pushEnabled;
  }

  isChannelEnabledForType(
    type: NotificationType,
    channel: "email" | "inApp" | "push",
  ): boolean {
    // Global switch check
    if (channel === "email" && !this.props.emailEnabled) return false;
    if (channel === "inApp" && !this.props.inAppEnabled) return false;
    if (channel === "push" && !this.props.pushEnabled) return false;

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
}
