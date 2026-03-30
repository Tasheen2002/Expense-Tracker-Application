import { PreferenceService } from '../services/preference.service';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export class GetOrCreatePreferencesQuery implements IQuery {
  readonly queryId?: string;
  readonly timestamp?: Date;

  constructor(
    public readonly userId: string,
    public readonly workspaceId: string
  ) {}
}

export class GetOrCreatePreferencesHandler implements IQueryHandler<
  GetOrCreatePreferencesQuery,
  QueryResult<NotificationPreference | null>
> {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(
    query: GetOrCreatePreferencesQuery
  ): Promise<QueryResult<NotificationPreference | null>> {
    const preferences = await this.preferenceService.getPreferences(
      query.userId,
      query.workspaceId
    );
    return QueryResult.success(preferences);
  }
}
