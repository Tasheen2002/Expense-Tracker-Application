import {
  PreferenceService,
  GlobalPreferenceSettings,
} from '../services/preference.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface UpdatePreferencesCommand extends ICommand {
  userId: string;
  workspaceId: string;
  settings: GlobalPreferenceSettings;
}

export class UpdatePreferencesHandler implements ICommandHandler<
  UpdatePreferencesCommand,
  CommandResult<void>
> {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(input: UpdatePreferencesCommand): Promise<CommandResult<void>> {
    try {
      await this.preferenceService.updateGlobalPreferences(
        input.userId,
        input.workspaceId,
        input.settings
      );
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
