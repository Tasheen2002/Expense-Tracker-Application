import { NotificationService } from '../services/notification.service';
import { Notification } from '../../domain/entities/notification.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
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
  QueryResult<PaginatedResult<Notification>>
> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(
    input: GetUnreadNotificationsQuery
  ): Promise<QueryResult<PaginatedResult<Notification>>> {
    try {
      const result = await this.notificationService.getUnreadNotifications(
        input.recipientId,
        input.workspaceId
      );
      return QueryResult.success(result);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
