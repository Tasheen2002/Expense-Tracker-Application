import { INotificationPreferenceRepository } from "../../domain/repositories/notification-preference.repository";
import {
  NotificationPreference,
  TypeSettingValue,
} from "../../domain/entities/notification-preference.entity";
import { NotificationType } from "../../domain/enums/notification-type.enum";
import { PreferenceId } from "../../domain/value-objects/preference-id";
import { UserId, WorkspaceId } from "../../domain/value-objects";
import { NotificationPreferenceNotFoundError } from "../../domain/errors/notification.errors";

export interface GlobalPreferenceSettings {
  email?: boolean;
  inApp?: boolean;
  push?: boolean;
}

export class PreferenceService {
  constructor(
    private readonly preferenceRepository: INotificationPreferenceRepository,
  ) {}

  async getOrCreatePreferences(
    userId: string,
    workspaceId: string,
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
      await this.preferenceRepository.save(preferences);
    }

    return preferences;
  }

  async getPreferences(
    userId: string,
    workspaceId: string,
  ): Promise<NotificationPreference | null> {
    const userIdVO = UserId.fromString(userId);
    const wsId = WorkspaceId.fromString(workspaceId);
    return this.preferenceRepository.findByUserAndWorkspace(userIdVO, wsId);
  }

  async getPreferencesById(id: string): Promise<NotificationPreference> {
    const preferenceId = PreferenceId.fromString(id);
    const preferences = await this.preferenceRepository.findById(preferenceId);

    if (!preferences) {
      throw new NotificationPreferenceNotFoundError(id, "unknown");
    }

    return preferences;
  }

  async updateGlobalPreferences(
    userId: string,
    workspaceId: string,
    settings: GlobalPreferenceSettings,
  ): Promise<NotificationPreference> {
    const preferences = await this.getOrCreatePreferences(userId, workspaceId);
    preferences.updateGlobalSettings(settings);
    await this.preferenceRepository.save(preferences);
    return preferences;
  }

  async updateTypePreference(
    userId: string,
    workspaceId: string,
    type: NotificationType,
    settings: TypeSettingValue,
  ): Promise<NotificationPreference> {
    const preferences = await this.getOrCreatePreferences(userId, workspaceId);
    preferences.updateTypeSetting(type, settings);
    await this.preferenceRepository.save(preferences);
    return preferences;
  }

  async isChannelEnabled(
    userId: string,
    workspaceId: string,
    type: NotificationType,
    channel: "email" | "inApp" | "push",
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId, workspaceId);

    if (!preferences) {
      // Default: email and inApp enabled, push disabled
      return channel !== "push";
    }

    return preferences.isChannelEnabledForType(type, channel);
  }
}
