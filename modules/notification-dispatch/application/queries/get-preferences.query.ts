import { PreferenceService } from '../services/preference.service';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
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
  QueryResult<NotificationPreference | null>
> {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(
    input: GetPreferencesQuery
  ): Promise<QueryResult<NotificationPreference | null>> {
    try {
      const preferences = await this.preferenceService.getPreferences(
        input.userId,
        input.workspaceId
      );
      return QueryResult.success(preferences);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
