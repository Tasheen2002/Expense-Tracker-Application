import { NotificationService } from '../services/notification.service';
import { Notification } from '../../domain/entities/notification.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ListNotificationsQuery extends IQuery {
  recipientId: string;
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListNotificationsHandler implements IQueryHandler<
  ListNotificationsQuery,
  QueryResult<PaginatedResult<Notification>>
> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(
    input: ListNotificationsQuery
  ): Promise<QueryResult<PaginatedResult<Notification>>> {
    try {
      const result = await this.notificationService.getNotifications(
        input.recipientId,
        input.workspaceId,
        { limit: input.limit, offset: input.offset }
      );
      return QueryResult.success(result);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
