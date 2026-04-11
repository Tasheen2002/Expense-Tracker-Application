import { NotificationService } from '../services/notification.service';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetUnreadCountQuery extends IQuery {
  recipientId: string;
  workspaceId: string;
}

export class GetUnreadCountHandler implements IQueryHandler<
  GetUnreadCountQuery,
  number
> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(input: GetUnreadCountQuery): Promise<number> {
    return this.notificationService.getUnreadCount(
      input.recipientId,
      input.workspaceId
    );
  }
}
