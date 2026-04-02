import { PreferenceService } from '../services/preference.service';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { TypeSettingValue } from '../../domain/entities/notification-preference.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface UpdateTypePreferenceCommand extends ICommand {
  userId: string;
  workspaceId: string;
  type: NotificationType;
  settings: TypeSettingValue;
}

export class UpdateTypePreferenceHandler implements ICommandHandler<
  UpdateTypePreferenceCommand,
  CommandResult<void>
> {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(
    input: UpdateTypePreferenceCommand
  ): Promise<CommandResult<void>> {
    try {
      await this.preferenceService.updateTypePreference(
        input.userId,
        input.workspaceId,
        input.type,
        input.settings
      );
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
