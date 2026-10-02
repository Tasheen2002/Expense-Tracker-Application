import { Notification } from "../entities/notification.entity";
import { NotificationId } from "../value-objects/notification-id";
import { UserId, WorkspaceId } from "../value-objects";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface INotificationRepository {
  findRequest(request: NotificationRequestIdentity): Promise<Notification[] | null>;
  /** Atomically persist receipt, channel intent/events and eligible email jobs.
   * Returns the existing channel records when another caller won the request. */
  saveRequest(request: NotificationRequestIdentity, notifications: readonly Notification[]): Promise<Notification[]>;
  /** Create new or save repository-loaded aggregates using optimistic concurrency.
   * Stale snapshots fail atomically; prefer mutate for current-state commands. */
  saveBatch(notifications: readonly Notification[]): Promise<void>;
  /** Lock a recipient/workspace-scoped aggregate, persist mutation and events atomically. */
  mutate(id: NotificationId, recipientId: UserId, workspaceId: WorkspaceId,
    mutation: (notification: Notification) => void): Promise<Notification>;
  save(notification: Notification): Promise<void>;
  findById(id: NotificationId): Promise<Notification | null>;
  findUnreadByRecipient(
    recipientId: UserId,
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Notification>>;
  findByRecipient(
    recipientId: UserId,
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Notification>>;
  countUnread(recipientId: UserId, workspaceId: WorkspaceId): Promise<number>;
  markAllAsRead(recipientId: UserId, workspaceId: WorkspaceId): Promise<void>;
}

export interface NotificationRequestIdentity {
  id: string;
  fingerprint: string;
  workspaceId: string;
  recipientId: string;
}
