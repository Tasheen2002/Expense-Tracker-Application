import { PreferenceService } from '../services/preference.service';
import { NotificationPreferenceDTO } from '../../domain/entities/notification-preference.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

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
  QueryResult<NotificationPreferenceDTO | null>
> {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(
    query: GetOrCreatePreferencesQuery
  ): Promise<QueryResult<NotificationPreferenceDTO | null>> {
    const preferences = await this.preferenceService.getPreferences(
      query.userId,
      query.workspaceId
    );
    return QueryResult.success(preferences);
  }
}
