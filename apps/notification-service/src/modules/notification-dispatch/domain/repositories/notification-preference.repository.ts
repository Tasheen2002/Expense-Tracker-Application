import { NotificationPreference } from "../entities/notification-preference.entity";
import { PreferenceId } from "../value-objects/preference-id";
import { UserId, WorkspaceId } from "../value-objects";

export interface INotificationPreferenceRepository {
  /** Serialize create/read/mutate/write for this user/workspace. Callback must be synchronous;
   * on failure neither the default row nor the mutation may commit. */
  mutate(userId: UserId, workspaceId: WorkspaceId,
    mutation: (preference: NotificationPreference) => void): Promise<NotificationPreference>;
  /** Create a new aggregate or save a repository-loaded snapshot; reject stale writes. */
  save(preference: NotificationPreference): Promise<void>;
  findById(id: PreferenceId): Promise<NotificationPreference | null>;
  findByUserAndWorkspace(
    userId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<NotificationPreference | null>;
}
