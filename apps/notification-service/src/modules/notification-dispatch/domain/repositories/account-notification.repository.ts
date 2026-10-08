import {
  AccountNotification,
  AccountNotificationSettings,
} from '../entities/account-notification.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
export interface IAccountNotificationRepository {
  accept(
    notification: AccountNotification,
    fingerprint: string
  ): Promise<{ duplicate: boolean; suppressed: boolean }>;
  list(
    userId: string,
    limit: number,
    offset: number
  ): Promise<PaginatedResult<AccountNotification>>;
  markRead(userId: string, id: string): Promise<void>;
  getPreferences(userId: string): Promise<AccountNotificationSettings>;
  setPreferences(
    userId: string,
    settings: AccountNotificationSettings
  ): Promise<void>;
}
