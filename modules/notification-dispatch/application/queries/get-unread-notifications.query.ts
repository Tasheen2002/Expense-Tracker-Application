import { NotificationService } from '../services/notification.service';
import { NotificationDTO } from '../../domain/entities/notification.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetUnreadNotificationsQuery extends IQuery {
  recipientId: string;
  workspaceId: string;
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
