import { NotificationService } from '../services/notification.service';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetUnreadCountQuery extends IQuery {
  recipientId: string;
  workspaceId: string;
}

export class GetUnreadCountHandler implements IQueryHandler<
  GetUnreadCountQuery,
  QueryResult<number>
> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(input: GetUnreadCountQuery): Promise<QueryResult<number>> {
    try {
      const count = await this.notificationService.getUnreadCount(
        input.recipientId,
        input.workspaceId
      );
      return QueryResult.success(count);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
