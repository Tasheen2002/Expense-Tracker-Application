import { PreferenceService } from "../services/preference.service";

export class GetPreferencesQuery {
  constructor(
    public readonly userId: string,
    public readonly workspaceId: string,
  ) {}
}

export class GetPreferencesHandler {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(query: GetPreferencesQuery) {
    return await this.preferenceService.getPreferences(
      query.userId,
      query.workspaceId,
    );
  }
}
