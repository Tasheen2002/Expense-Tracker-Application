import { PreferenceService } from '../services/preference.service';
import { NotificationPreferenceDTO } from '../../domain/entities/notification-preference.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetPreferencesQuery extends IQuery {
  readonly userId: string;
  readonly workspaceId: string;
}

export class GetPreferencesHandler implements IQueryHandler<
  GetPreferencesQuery,
  NotificationPreferenceDTO | null
> {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(
    input: GetPreferencesQuery
  ): Promise<NotificationPreferenceDTO | null> {
    return this.preferenceService.getPreferences(
      input.userId,
      input.workspaceId
    );
  }
}
