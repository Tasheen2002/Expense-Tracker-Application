import {
  PreferenceService,
  GlobalPreferenceSettings,
} from "../services/preference.service";

export class UpdatePreferencesCommand {
  constructor(
    public readonly userId: string,
    public readonly workspaceId: string,
    public readonly settings: GlobalPreferenceSettings,
  ) {}
}

export class UpdatePreferencesHandler {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(command: UpdatePreferencesCommand) {
    return await this.preferenceService.updateGlobalPreferences(
      command.userId,
      command.workspaceId,
      command.settings,
    );
  }
}
