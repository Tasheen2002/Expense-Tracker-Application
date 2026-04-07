import { PreferenceService } from '../services/preference.service';
import { NotificationPreferenceDTO } from '../../domain/entities/notification-preference.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetPreferencesQuery extends IQuery {
  userId: string;
  workspaceId: string;
}

export class GetPreferencesHandler implements IQueryHandler<
  GetPreferencesQuery,
  QueryResult<NotificationPreferenceDTO | null>
> {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(
    input: GetPreferencesQuery
  ): Promise<QueryResult<NotificationPreferenceDTO | null>> {
    const preferences = await this.preferenceService.getPreferences(
      input.userId,
      input.workspaceId
    );
    return QueryResult.success(preferences);
  }
}
