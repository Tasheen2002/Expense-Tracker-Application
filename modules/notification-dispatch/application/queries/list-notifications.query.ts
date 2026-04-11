import { NotificationService } from '../services/notification.service';
import { NotificationDTO } from '../../domain/entities/notification.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface ListNotificationsQuery extends IQuery {
  recipientId: string;
  workspaceId: string;
  limit?: number;
  offset?: number;
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
