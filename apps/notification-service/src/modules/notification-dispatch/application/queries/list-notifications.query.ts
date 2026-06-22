import { NotificationService } from '../services/notification.service';
import { NotificationDTO } from '../../domain/entities/notification.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface ListNotificationsQuery extends IQuery {
  readonly recipientId: string;
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListNotificationsHandler implements IQueryHandler<
  ListNotificationsQuery,
  PaginatedResult<NotificationDTO>
> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(
    input: ListNotificationsQuery
  ): Promise<PaginatedResult<NotificationDTO>> {
    return this.notificationService.getNotifications(
      input.recipientId,
      input.workspaceId,
      { limit: input.limit, offset: input.offset }
    );
  }
}
