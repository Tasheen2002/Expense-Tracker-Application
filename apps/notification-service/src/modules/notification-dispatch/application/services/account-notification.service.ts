import { createHash } from 'node:crypto';
import {
  accountEventOwner,
  accountLifecycleAliases,
  canonicalEventJson,
  AccountEventEnvelope,
} from '../../../../../../../packages/contracts/src/account-events';
import { AccountNotification } from '../../domain/entities/account-notification.entity';
import { IAccountNotificationRepository } from '../../domain/repositories/account-notification.repository';
import { InvalidNotificationDataError } from '../../domain/errors/notification.errors';

export class AccountNotificationService {
  constructor(private readonly repository: IAccountNotificationRepository) {}
  async accept(event: AccountEventEnvelope) {
    const userId = accountEventOwner(event);
    if (
      !userId ||
      !Object.prototype.hasOwnProperty.call(
        accountLifecycleAliases,
        event.eventType
      )
    ) {
      throw new InvalidNotificationDataError(
        'eventType',
        'unsupported account notification event'
      );
    }
    const eventType =
      accountLifecycleAliases[
        event.eventType as keyof typeof accountLifecycleAliases
      ];
    const notification = AccountNotification.create(
      event.eventId,
      userId,
      eventType,
      event.timestamp ? new Date(event.timestamp) : new Date()
    );
    return {
      notificationId: event.eventId,
      ...(await this.repository.accept(
        notification,
        createHash('sha256').update(canonicalEventJson(event)).digest('hex')
      )),
    };
  }
}
