import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { AccountNotificationSettings } from '../../domain/entities/account-notification.entity';
import { IAccountNotificationRepository } from '../../domain/repositories/account-notification.repository';
import { UserId } from '../../domain/value-objects';

export interface GetAccountNotificationPreferencesQuery extends IQuery {
  readonly actorId: string;
}

export class GetAccountNotificationPreferencesHandler implements IQueryHandler<
  GetAccountNotificationPreferencesQuery,
  AccountNotificationSettings
> {
  constructor(private readonly repository: IAccountNotificationRepository) {}

  async handle(
    query: GetAccountNotificationPreferencesQuery
  ): Promise<AccountNotificationSettings> {
    return this.repository.getPreferences(
      UserId.fromString(query.actorId).getValue()
    );
  }
}
