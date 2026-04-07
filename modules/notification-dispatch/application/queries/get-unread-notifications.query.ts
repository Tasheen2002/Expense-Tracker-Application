import { NotificationService } from '../services/notification.service';
import { NotificationDTO } from '../../domain/entities/notification.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetUnreadNotificationsQuery extends IQuery {
  recipientId: string;
  workspaceId: string;
}

export class GetUnreadNotificationsHandler implements IQueryHandler<
  GetUnreadNotificationsQuery,
  QueryResult<PaginatedResult<NotificationDTO>>
> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(
    input: GetUnreadNotificationsQuery
  ): Promise<QueryResult<PaginatedResult<NotificationDTO>>> {
    const result = await this.notificationService.getUnreadNotifications(
      input.recipientId,
      input.workspaceId
    );
    return QueryResult.success(result);
  }
}
