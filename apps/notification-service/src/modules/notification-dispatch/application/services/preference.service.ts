import { INotificationPreferenceRepository } from "../../domain/repositories/notification-preference.repository";
import {
  NotificationPreference,
  NotificationPreferenceDTO,
  TypeSettingValue,
} from "../../domain/entities/notification-preference.entity";
import { NotificationType } from "../../domain/enums/notification-type.enum";
import { PreferenceId } from "../../domain/value-objects/preference-id";
import { UserId, WorkspaceId } from "../../domain/value-objects";
import { PreferenceNotFoundByIdError } from "../../domain/errors/notification.errors";

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
  ): Promise<NotificationPreferenceDTO> {
    const preferences = await this.preferenceRepository.mutate(
      UserId.fromString(userId), WorkspaceId.fromString(workspaceId), () => {},
    );
    return NotificationPreference.toDTO(preferences);
  }

  async getPreferences(
    userId: string,
    workspaceId: string,
  ): Promise<NotificationPreferenceDTO | null> {
    const userIdVO = UserId.fromString(userId);
    const wsId = WorkspaceId.fromString(workspaceId);
    const preferences = await this.preferenceRepository.findByUserAndWorkspace(userIdVO, wsId);
    return preferences ? NotificationPreference.toDTO(preferences) : null;
  }

  // Actor IDs must come from trusted authentication, not request bodies.
  async getPreferencesById(id: string, userId: string, workspaceId: string): Promise<NotificationPreferenceDTO> {
    const preferenceId = PreferenceId.fromString(id);
    const preferences = await this.preferenceRepository.findByUserAndWorkspace(
      UserId.fromString(userId), WorkspaceId.fromString(workspaceId),
    );

    if (!preferences || !preferences.id.equals(preferenceId)) {
      throw new PreferenceNotFoundByIdError(id);
    }

    return NotificationPreference.toDTO(preferences);
  }

  async updateGlobalPreferences(
    userId: string,
    workspaceId: string,
    settings: GlobalPreferenceSettings,
  ): Promise<NotificationPreferenceDTO> {
    const pref = await this.preferenceRepository.mutate(
      UserId.fromString(userId), WorkspaceId.fromString(workspaceId),
      preference => preference.updateGlobalSettings(settings),
    );
    return NotificationPreference.toDTO(pref);
  }

  async updateTypePreference(
    userId: string,
    workspaceId: string,
    type: NotificationType,
    settings: TypeSettingValue,
  ): Promise<NotificationPreferenceDTO> {
    const pref = await this.preferenceRepository.mutate(
      UserId.fromString(userId), WorkspaceId.fromString(workspaceId),
      preference => preference.updateTypeSetting(type, settings),
    );
    return NotificationPreference.toDTO(pref);
  }

  async isChannelEnabled(
    userId: string,
    workspaceId: string,
    type: NotificationType,
    channel: "email" | "inApp" | "push",
  ): Promise<boolean> {
    const userIdVO = UserId.fromString(userId);
    const wsId = WorkspaceId.fromString(workspaceId);
    const preferences = await this.preferenceRepository.findByUserAndWorkspace(userIdVO, wsId);

    return (preferences ?? NotificationPreference.create({ userId: userIdVO, workspaceId: wsId }))
      .isChannelEnabledForType(type, channel);
  }
}
