import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import {
  AccountNotificationSettings,
  validateAccountNotificationSettings,
} from '../../domain/entities/account-notification.entity';
import { IAccountNotificationRepository } from '../../domain/repositories/account-notification.repository';
import { UserId } from '../../domain/value-objects';

export interface UpdateAccountNotificationPreferencesCommand extends ICommand {
  readonly actorId: string;
  readonly settings: AccountNotificationSettings;
}

export class UpdateAccountNotificationPreferencesHandler implements ICommandHandler<
  UpdateAccountNotificationPreferencesCommand,
  CommandResult<void>
> {
  constructor(private readonly repository: IAccountNotificationRepository) {}

  async handle(
    command: UpdateAccountNotificationPreferencesCommand
  ): Promise<CommandResult<void>> {
    await this.repository.setPreferences(
      UserId.fromString(command.actorId).getValue(),
      validateAccountNotificationSettings(command.settings)
    );
    return CommandResult.success();
  }
}
