import { NotificationTemplate } from "../entities/notification-template.entity";
import { NotificationType } from "../enums/notification-type.enum";
import { NotificationChannel } from "../enums/notification-channel.enum";
import { TemplateId } from "../value-objects/template-id";
import { WorkspaceId } from "../value-objects";

export interface INotificationTemplateRepository {
  /** Lock and mutate a template within its workspace; rollback on callback failure. */
  mutate(id: TemplateId, workspaceId: WorkspaceId,
    mutation: (template: NotificationTemplate) => void): Promise<NotificationTemplate>;
  /** Create a new aggregate or save a repository-loaded snapshot; reject stale writes. */
  save(template: NotificationTemplate): Promise<void>;
  findById(id: TemplateId): Promise<NotificationTemplate | null>;
  findActiveTemplate(
    workspaceId: WorkspaceId | undefined,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<NotificationTemplate | null>;
}
