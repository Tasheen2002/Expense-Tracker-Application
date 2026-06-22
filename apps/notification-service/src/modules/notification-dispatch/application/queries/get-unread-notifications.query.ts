import { NotificationService } from '../services/notification.service';
import { NotificationDTO } from '../../domain/entities/notification.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetUnreadNotificationsQuery extends IQuery {
  readonly recipientId: string;
  readonly workspaceId: string;
}

export class GetUnreadNotificationsHandler implements IQueryHandler<
  GetUnreadNotificationsQuery,
  PaginatedResult<NotificationDTO>
> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(
    input: GetUnreadNotificationsQuery
  ): Promise<PaginatedResult<NotificationDTO>> {
    return this.notificationService.getUnreadNotifications(
      input.recipientId,
      input.workspaceId
    );
  }
}
