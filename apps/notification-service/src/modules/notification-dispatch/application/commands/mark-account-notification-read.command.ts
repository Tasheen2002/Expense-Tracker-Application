import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { IAccountNotificationRepository } from '../../domain/repositories/account-notification.repository';
import { UserId, NotificationId } from '../../domain/value-objects';

export interface MarkAccountNotificationReadCommand extends ICommand {
  readonly actorId: string;
  readonly notificationId: string;
}

export class MarkAccountNotificationReadHandler implements ICommandHandler<
  MarkAccountNotificationReadCommand,
  CommandResult<void>
> {
  constructor(private readonly repository: IAccountNotificationRepository) {}

  async handle(
    command: MarkAccountNotificationReadCommand
  ): Promise<CommandResult<void>> {
    await this.repository.markRead(
      UserId.fromString(command.actorId).getValue(),
      NotificationId.fromString(command.notificationId).getValue()
    );
    return CommandResult.success();
  }
}
