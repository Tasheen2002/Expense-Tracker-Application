import { NotificationService } from '../services/notification.service';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetUnreadCountQuery extends IQuery {
  readonly recipientId: string;
  readonly workspaceId: string;
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
