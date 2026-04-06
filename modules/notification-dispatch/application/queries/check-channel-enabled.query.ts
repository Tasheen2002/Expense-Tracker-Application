import { PreferenceService } from '../services/preference.service';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface CheckChannelEnabledQuery extends IQuery {
  userId: string;
  workspaceId: string;
  type: NotificationType;
  channel: 'email' | 'inApp' | 'push';
}

export class CheckChannelEnabledHandler implements IQueryHandler<
  CheckChannelEnabledQuery,
  QueryResult<boolean>
> {
  constructor(private readonly preferenceService: PreferenceService) {}

  async handle(input: CheckChannelEnabledQuery): Promise<QueryResult<boolean>> {
    try {
      const isEnabled = await this.preferenceService.isChannelEnabled(
        input.userId,
        input.workspaceId,
        input.type,
        input.channel
      );
      return QueryResult.success(isEnabled);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
