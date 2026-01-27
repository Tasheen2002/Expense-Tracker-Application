import { NotificationPreference } from "../entities/notification-preference.entity";
import { PreferenceId } from "../value-objects/preference-id";
import { UserId, WorkspaceId } from "../value-objects";

export interface INotificationPreferenceRepository {
  save(preference: NotificationPreference): Promise<void>;
  findById(id: PreferenceId): Promise<NotificationPreference | null>;
  findByUserAndWorkspace(
    userId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<NotificationPreference | null>;
}
