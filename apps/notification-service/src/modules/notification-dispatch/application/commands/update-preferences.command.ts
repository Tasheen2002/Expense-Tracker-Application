import {
  PreferenceService,
  GlobalPreferenceSettings,
} from '../services/preference.service';
import { NotificationPreferenceDTO } from '../../domain/entities/notification-preference.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdatePreferencesCommand extends ICommand {
  readonly userId: string;
  readonly workspaceId: string;
  readonly settings: GlobalPreferenceSettings;
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
