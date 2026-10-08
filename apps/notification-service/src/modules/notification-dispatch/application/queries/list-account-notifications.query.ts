import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { AccountNotification } from '../../domain/entities/account-notification.entity';
import { IAccountNotificationRepository } from '../../domain/repositories/account-notification.repository';
import { UserId } from '../../domain/value-objects';
import { InvalidNotificationDataError } from '../../domain/errors/notification.errors';

export interface ListAccountNotificationsQuery extends IQuery {
  readonly actorId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListAccountNotificationsHandler implements IQueryHandler<
  ListAccountNotificationsQuery,
  PaginatedResult<ReturnType<AccountNotification['toDTO']>>
> {
  constructor(private readonly repository: IAccountNotificationRepository) {}

  async handle({
    actorId,
    limit = 50,
    offset = 0,
  }: ListAccountNotificationsQuery) {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 2147483647
    ) {
      throw new InvalidNotificationDataError(
        'pagination',
        'invalid limit or offset'
      );
    }
    const page = await this.repository.list(
      UserId.fromString(actorId).getValue(),
      limit,
      offset
    );
    return { ...page, items: page.items.map((item) => item.toDTO()) };
  }
}
