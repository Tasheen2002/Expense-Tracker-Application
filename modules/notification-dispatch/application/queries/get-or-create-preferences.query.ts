import { PreferenceService } from '../services/preference.service';
import { NotificationPreferenceDTO } from '../../domain/entities/notification-preference.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

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
  NotificationPreferenceDTO | null
> {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(
    query: GetOrCreatePreferencesQuery
  ): Promise<NotificationPreferenceDTO | null> {
    return this.preferenceService.getPreferences(
      query.userId,
      query.workspaceId
    );
  }
}
