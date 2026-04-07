import {
  PreferenceService,
  GlobalPreferenceSettings,
} from '../services/preference.service';
import { NotificationPreferenceDTO } from '../../domain/entities/notification-preference.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface UpdatePreferencesCommand extends ICommand {
  userId: string;
  workspaceId: string;
  settings: GlobalPreferenceSettings;
}

export class UpdatePreferencesHandler implements ICommandHandler<
  UpdatePreferencesCommand,
  CommandResult<NotificationPreferenceDTO>
> {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(input: UpdatePreferencesCommand): Promise<CommandResult<NotificationPreferenceDTO>> {
    const dto = await this.preferenceService.updateGlobalPreferences(
      input.userId,
      input.workspaceId,
      input.settings
    );
    return CommandResult.success(dto);
  }
}
